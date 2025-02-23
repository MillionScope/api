import { createWorkersAI } from "workers-ai-provider"
import { createDataStreamResponse, smoothStream, streamText } from "ai"
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

	const db = env.DB_CHAT
	if (!db) {
		console.log("db", db)
		return responseFailed(null, "No db environment found", 404, corsHeaders)
	}

	const { id, messages, selectedChatModel } = await request.json()

	if (!id || !messages || !selectedChatModel) {
		return responseFailed(null, "Missing param in request", 400, corsHeaders)
	}

	const workersai = createWorkersAI({ binding: aienv })

	const userMessage = getMostRecentUserMessage(messages)
	console.log("go here userMessage", userMessage)

	if (!userMessage) {
		console.log("messages", messages)
		return responseFailed(null, "No user message found", 400, corsHeaders)
	}

	const chat = await getChatById(db, id)

	if (!chat) {
		const title = await generateTitleFromUserMessage(workersai, userMessage)
		await saveChat(db, id, session.user.id, title)
	}

	await saveMessages(db, [{ ...userMessage, createdAt: new Date(), chatId: id }])

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
		execute: (dataStream) => {
			const result = streamText({
				model: workersai,
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
					if (session.user?.id) {
						try {
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
									createdAt: new Date(),
								}
							})

							await saveMessages(db, messagesSanitized)
						} catch (error) {
							console.error("Failed to save chat")
						}
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
	console.log("id")
	const { results: chat } = await db.prepare("SELECT * FROM Chat WHERE id =? ").bind(id).run()

	return chat
}

async function saveChat(db, id, userId, title) {
	console.log("saveChat", id, userId, title)
	const { results: chat } = await db.prepare("INSERT INTO Chat (id, userId, title) VALUES (?, ?, ?)").bind(id, userId, title).run()

	return chat
}

async function saveMessages(db, messages) {
	console.log("saveMessages", messages)
	const stmt = db.prepare("INSERT INTO Message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)")
	const batch = Array.from(messages).map((message) =>
		stmt.bind(message.id, message.chatId, message.role, message.content, message.createdAt)
	)

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
