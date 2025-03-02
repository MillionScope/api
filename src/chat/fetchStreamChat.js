import { createWorkersAI } from "workers-ai-provider"
import { createDataStreamResponse, generateObject, generateText, smoothStream, streamText } from "ai"
import { generateTitleFromUserMessage } from "@/ai/task"
import { responseFailed } from "@/response"
import { getMostRecentUserMessage } from "./utils"
import { systemPrompt } from "@/prompts"

export async function fetchStreamChat(request, env, corsHeaders) {
	const aienv = env.AI
	if (!aienv) {
		console.log("aienv", aienv)
		return responseFailed(null, "No ai environment found", 404, corsHeaders)
	}
	console.log("aienv", JSON.stringify(aienv))

	const db = env.DB_CHAT
	if (!db) {
		console.log("db", db)
		return responseFailed(null, "No db environment found", 404, corsHeaders)
	}

	const { id, messages, selectedChatModel } = await request.json()
	const userid = "5553a32b2fa51b29575dbe28bd6b36cd"

	if (!id || !messages || !selectedChatModel) {
		console.log("data", { id, messages, selectedChatModel })
		return responseFailed(null, "Missing param in request", 400, corsHeaders)
	}
	console.log("id, messages, selectedChatModel", id, JSON.stringify(messages), selectedChatModel)

	const workersai = createWorkersAI({ binding: aienv })

	const userMessage = getMostRecentUserMessage(messages)

	if (!userMessage) {
		console.log("messages", messages)
		return responseFailed(null, "No user message found", 400, corsHeaders)
	}

	const chat = await getChatById(db, id)

	if (!chat || chat.length === 0) {
		console.log("chat", chat)
		const title = await generateTitleFromUserMessage(workersai, userMessage)
		await saveChat(db, id, userid, title)
	}

	const newMessage = [{ ...userMessage, createdAt: new Date().toISOString(), chatId: id }]
	console.log("newMessage", JSON.stringify(newMessage))
	const abc = {
		id: newMessage.id,
		chatId: newMessage.chatId,
		role: newMessage.role,
		content: newMessage.content,
		createdAt: new Date().toISOString(),
	}
	await saveMessages(db, newMessage)

	// Use the AI provider to interact with the Vercel AI SDK
	// Here, we generate a chat stream based on a prompt
	// const text = await streamText({
	// 	model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
	// 	messages: [
	// 		{
	// 			role: "user",
	// 			content: "Write an essay about hello world",
	// 		},
	// 	],
	// })

	// return text.toTextStreamResponse({
	// 	headers: {
	// 		// add these headers to ensure that the
	// 		// response is chunked and streamed
	// 		"Content-Type": "text/x-unknown",
	// 		"content-encoding": "identity",
	// 		"transfer-encoding": "chunked",
	// 		...corsHeaders,
	// 	},
	// })
	return createDataStreamResponse({
		headers: {
			...corsHeaders,
		},
		execute: (dataStream) => {
			const result = streamText({
				model: workersai("@cf/meta/llama-2-7b-chat-int8"),
				system: systemPrompt({ selectedChatModel }),
				messages,
				maxSteps: 5,
				experimental_transform: smoothStream({ chunking: "word" }),
				// experimental_generateMessageId: generateUUID,
				// tools: {
				//   getWeather,
				//   createDocument: createDocument({ session, dataStream }),
				//   updateDocument: updateDocument({ session, dataStream }),
				//   requestSuggestions: requestSuggestions({
				//     session,
				//     dataStream,
				//   }),
				// },
				onFinish: async ({ response, reasoning }) => {
					try {
						// console.log("response", JSON.stringify(response))
						// console.log("reasoning", JSON.stringify(reasoning))
						const sanitizedResponseMessages = sanitizeResponseMessages({
							messages: response.messages,
							reasoning,
						})

						const messagesSanitized = sanitizedResponseMessages.map((message) => {
							return {
								id: message.id,
								chatId: id,
								role: message.role,
								content: message.content,
								createdAt: new Date().toISOString(),
							}
						})

						await saveMessages(db, messagesSanitized)
					} catch (error) {
						console.log("error", error)
						console.error("Failed to save chat")
					}
				},
				experimental_telemetry: {
					isEnabled: true,
					functionId: "stream-text",
				},
			})

			result.consumeStream()

			result.mergeIntoDataStream(dataStream, {
				sendReasoning: true,
			})
		},
		onError: () => {
			return "Oops, an error occured!"
		},
	})
}

async function getChatById(db, id) {
	const { results: chat } = await db.prepare("SELECT * FROM Chat WHERE id = ? ").bind(id).run()

	return chat
}

async function saveChat(db, id, userId, title) {
	const { results: chat } = await db
		.prepare("INSERT INTO Chat (id, userId, title, createdAt) VALUES (?, ?, ?, ?)")
		.bind(id, userId, title, new Date().toISOString())
		.run()

	return chat
}

async function saveMessages(db, messages) {
	// console.log("function.saveMessages", JSON.stringify(messages))
	const stmt = db.prepare("INSERT INTO Message (chatId, role, content, createdAt) VALUES (?, ?, ?, ?)")
	const batch = Array.from(messages).map((message) => {
		return stmt.bind(message.chatId, message.role, JSON.stringify(message.content), message.createdAt)
	})

	const batchResults = await db.batch(batch)

	return batchResults
}

function sanitizeResponseMessages({ messages, reasoning }) {
	const toolResultIds = []

	for (const message of messages) {
		if (message.role === "tool") {
			for (const content of message.content) {
				if (content.type === "tool-result") {
					toolResultIds.push(content.toolCallId)
				}
			}
		}
	}

	const messagesBySanitizedContent = messages.map((message) => {
		if (message.role !== "assistant") return message

		if (typeof message.content === "string") return message

		const sanitizedContent = message.content.filter((content) =>
			content.type === "tool-call" ? toolResultIds.includes(content.toolCallId) : content.type === "text" ? content.text.length > 0 : true
		)

		if (reasoning) {
			sanitizedContent.push({ type: "reasoning", reasoning })
		}

		return {
			...message,
			content: sanitizedContent,
		}
	})

	return messagesBySanitizedContent.filter((message) => message.content.length > 0)
}
