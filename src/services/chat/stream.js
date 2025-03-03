// api/src/services/chat/stream.js
import { createWorkersAI } from "workers-ai-provider"
import { createDataStreamResponse, smoothStream, streamText } from "ai"
import { systemPrompt } from "../../utils/prompts"
import { documentHandlersByArtifactKind } from "../../artifacts/handler"
import { sanitizeResponseMessages, saveMessages } from "../../handlers/message"

export async function streamChat(request, env, corsHeaders) {
	const { id, messages, selectedChatModel } = await request.json()
	const workersai = createWorkersAI({ binding: env.AI })

	return createDataStreamResponse({
		headers: corsHeaders,
		execute: (dataStream) => {
			const result = streamText({
				model: workersai("@cf/meta/llama-2-7b-chat-int8"),
				system: systemPrompt({ selectedChatModel }),
				messages,
				maxSteps: 5,
				experimental_transform: smoothStream({ chunking: "word" }),
				tools: createToolHandlers(env, dataStream, id),
				onFinish: createFinishHandler(env.DB_CHAT, id),
			})

			result.consumeStream()
			result.mergeIntoDataStream(dataStream, { sendReasoning: true })
		},
		onError: (error) => {
			console.error("Stream error:", error)
			return "An error occurred during streaming"
		},
	})
}

function createToolHandlers(env, dataStream, userId) {
	return {
		createDocument: async ({ title, content, kind }) => {
			const handler = documentHandlersByArtifactKind.find((h) => h.kind === kind)
			if (!handler) throw new Error(`No handler found for kind: ${kind}`)

			return handler.onCreateDocument({
				id: crypto.randomUUID(),
				title,
				dataStream,
				session: { env, user: { id: userId } },
			})
		},
		updateDocument: async ({ id, description, kind }) => {
			const handler = documentHandlersByArtifactKind.find((h) => h.kind === kind)
			if (!handler) throw new Error(`No handler found for kind: ${kind}`)

			const document = await env.DB_CHAT.prepare("SELECT * FROM Document WHERE id = ?").bind(id).first()

			return handler.onUpdateDocument({
				document,
				description,
				dataStream,
				session: { env, user: { id: userId } },
			})
		},
	}
}

function createFinishHandler(db, chatId) {
	return async ({ response, reasoning }) => {
		try {
			const sanitizedMessages = sanitizeResponseMessages({
				messages: response.messages,
				reasoning,
			})

			const messagesSanitized = sanitizedMessages.map((message) => ({
				id: message.id,
				chatId,
				role: message.role,
				content: message.content,
				createdAt: new Date().toISOString(),
			}))

			await saveMessages(db, messagesSanitized)
		} catch (error) {
			console.error("Finish handler error:", error)
		}
	}
}
