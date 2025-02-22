import { createWorkersAI } from "workers-ai-provider"
import { streamText } from "ai"

export async function fetchStreamChat(request, env, corsHeaders) {
	const workersai = createWorkersAI({ binding: env.AI })
	// Use the AI provider to interact with the Vercel AI SDK
	// Here, we generate a chat stream based on a prompt
	const text = await streamText({
		model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
		messages: [
			{
				role: "user",
				content: "Write an essay about hello world",
			},
		],
	})

	return text.toTextStreamResponse({
		headers: {
			// add these headers to ensure that the
			// response is chunked and streamed
			"Content-Type": "text/x-unknown",
			"content-encoding": "identity",
			"transfer-encoding": "chunked",
			...corsHeaders,
		},
	})
}
