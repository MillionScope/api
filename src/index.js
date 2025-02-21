import { responseError, responseFailed } from "./response"
import { fetchChat } from "./chat/fetchChat"
import { finishChat } from "./chat/finishChat"
import { startChat } from "./chat/startChat"
import { fetchStreamChat } from "./chat/fetchStreamChat"

export default {
	async fetch(request, env, ctx) {
		const allowedOrigins = [env.ALLOWED_ORIGIN, env.ALLOWED_ORIGIN2] // List of allowed origins
		const origin = request.headers.get("Origin")

		const corsHeaders = {
			"Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS, PATCH",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Max-Age": "86400",
		}
		// if (origin && allowedOrigins.includes(origin)) {
		// 	corsHeaders["Access-Control-Allow-Origin"] = origin
		// }
		corsHeaders["Access-Control-Allow-Origin"] = "*"

		if (request.method === "OPTIONS") {
			// Handle CORS preflight requests
			return new Response(null, { headers: corsHeaders })
		}

		const url = new URL(request.url)
		const path = url.pathname
		const menthod = request.method

		try {
			if (url.pathname.startsWith("/api/")) {
				// const isValid = await isValidateToken(request, env)

				// if (!isValid) {
				// 	return responseError(null, "Unauthorized", 401, corsHeaders)
				// }
				const envAI = env.AI
				if (!envAI) {
					return responseError(null, "No ai environment found", 404, corsHeaders)
				}

				if (url.pathname.startsWith("/auth/")) {
					switch (path) {
						case "/auth/callback/github":
							return handleGithubCallback(request, env, corsHeaders)
						case "/auth/user":
							return handleGetUser(request, env, corsHeaders)
						case "/auth/logout":
							return handleLogout(request, env, corsHeaders)
						default:
							return responseFailed(null, "Invalid api", 404, corsHeaders)
					}
				} else {
					// else if (url.pathname.startsWith("/api/")) {
					return fetchStreamChat(request, env, corsHeaders)
				}

				// if (menthod === "GET") {
				// 	switch (path) {
				// 		case "/api/chat":
				// 			return fetchChat(request, db, corsHeaders)

				// 		default:
				// 			return responseFailed(null, "Invalid api", 404, corsHeaders)
				// 	}
				// } else if (menthod === "POST") {
				// 	switch (path) {
				// 		case "/api/start-chat":
				// 			return startChat(request, db, corsHeaders)
				// 		case "/api/finish-chat":
				// 			return finishChat(request, db, corsHeaders)
				// 		default:
				// 			return responseFailed(null, "Invalid api", 404, corsHeaders)
				// 	}
				// }
			}

			return responseError(null, "Invalid api", 404, corsHeaders)
		} catch (err) {
			const errorMessage = err.message || "An unknown error occurred"
			console.log("Exception", err)
			return responseError(err, errorMessage, 500, corsHeaders)
		}
	},
}
