import { createWorkersAI } from "workers-ai-provider"
import {
	createDataStreamResponse,
	extractReasoningMiddleware,
	generateObject,
	generateText,
	smoothStream,
	streamText,
	wrapLanguageModel,
} from "ai"
import { generateTitleFromUserMessage, requestSuggestions, updateDocument } from "@/ai/task"
import { responseFailed } from "@/response"
import { getMostRecentUserMessage } from "./utils"
import { generateUUID } from "@/utils"
import { createDocument } from "@/ai/tools"
import { systemPrompt } from "@/ai/prompts"
import { getWeather } from "@/ai/get-weather"
// import { documentHandlersByArtifactKind } from '../artifacts/artifacts.js'

export async function fetchStreamChat(c) {
	const aienv = c.env.AI
	if (!aienv) {
		console.log("aienv", aienv)
		return responseFailed(c, "No ai environment found", 404)
	}

	const db = c.env.DB_CHAT
	if (!db) {
		console.log("db", db)
		return responseFailed(c, "No db environment found", 404)
	}
	const { id, messages, selectedChatModel } = await c.req.json()
	const userid = "5553a32b2fa51b29575dbe28bd6b36cd"
	console.log("id, messages, selectedChatModel", id, messages, selectedChatModel)

	if (!id || !messages || !selectedChatModel) {
		console.log("data", { id, messages, selectedChatModel })
		return responseFailed(c, "Missing param in request", 400)
	}

	const workersai = createWorkersAI({ binding: aienv })

	const userMessage = getMostRecentUserMessage(messages)

	if (!userMessage) {
		console.log("messages", messages)
		return responseFailed(c, "No user message found", 400)
	}

	const chat = await getChatById(db, id)

	if (!chat || chat.length === 0) {
		console.log("chat", chat)
		const title = await generateTitleFromUserMessage(workersai, userMessage)
		await saveChat(db, id, userid, title)
	}

	const newMessage = [{ ...userMessage, createdAt: new Date().toISOString(), chatId: id }]
	// console.log("newMessage", JSON.stringify(newMessage))
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
		execute: (dataStream) => {
			const result = streamText({
				// model: workersai("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"), // @cf/meta/llama-2-7b-chat-int8
				model: wrapLanguageModel({
					model: workersai("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"),
					middleware: extractReasoningMiddleware({ tagName: "think" }),
				}),
				system: systemPrompt({ selectedChatModel }),
				messages,
				maxTokens: 2048,
				maxSteps: 5,
				experimental_transform: smoothStream({ chunking: "word" }),
				experimental_generateMessageId: generateUUID,
				experimental_activeTools: ["getWeather"],
				// , "updateDocument"
				tools: {
					getWeather,
				// 	createDocument: createDocument({ dataStream }),
				// 	// 	updateDocument: async ({ id, description, kind }) => { , workersai
				// 	// 		const handler = documentHandlersByArtifactKind.find(h => h.kind === kind);
				// 	// 		if (!handler) throw new Error(`No handler found for kind: ${kind}`);

				// 	// 		const session = { env, user: { id: userid } };
				// 	// 		const document = await getDocumentById(db, id);
				// 	// 		return handler.onUpdateDocument({
				// 	// 			document,
				// 	// 			description,
				// 	// 			dataStream,
				// 	// 			session
				// 	// 		});
				// 	// 	}
				},
				onFinish: async ({ response, reasoning }) => {
					try {
						// console.log("response", JSON.stringify(response))
						// console.log("reasoning", JSON.stringify(reasoning))
						const sanitizedResponseMessages = sanitizeResponseMessages({
							messages: response.messages,
							reasoning,
						})

						const messagesSanitized = sanitizedResponseMessages.map((message) => ({
							id: message.id,
							chatId: id,
							role: message.role,
							content: message.content,
							createdAt: new Date().toISOString(),
						}))

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
			return "Oops, an error occurred!"
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
