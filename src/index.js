import { responseError, responseFailed } from "./response"
import { fetchStreamChat } from "./chat/fetchStreamChat"
import { handleGithubCallback } from "./auth/handleGithubCallback"
import { handleGetUser } from "./auth/handleGetUser"
import { handleLogout } from "./auth/handleLogout"
import { getChatById } from "./chat/getChatById"
import { getChatsByUserId } from "./chat/getChatsByUserId"
import { saveMessage } from "./message/saveMessage"
import { getMessagesByChatId } from "./message/getMessagesByChatId"
import { createUser } from "./auth/createUser"

export default {
	async fetch(request, env, ctx) {
		const allowedOrigins = [env.ALLOWED_ORIGIN, env.ALLOWED_ORIGIN2, env.ALLOWED_ORIGIN3] // List of allowed origins
		const origin = request.headers.get("Origin")

		const corsHeaders = {
			"Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS, PATCH",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Max-Age": "86400",
		}
		if (origin && allowedOrigins.includes(origin)) {
			corsHeaders["Access-Control-Allow-Origin"] = origin
		}

		if (request.method === "OPTIONS") {
			// Handle CORS preflight requests
			return new Response(null, { headers: corsHeaders })
		}

		const url = new URL(request.url)
		const path = url.pathname
		const menthod = request.method

		try {
			if (url.pathname.startsWith("/auth/")) {
				switch (path) {
					case "/auth/callback/github":
						return handleGithubCallback(request, env, corsHeaders)
					case "/auth/user":
						return handleGetUser(request, env, corsHeaders)
					case "/auth/logout":
						return handleLogout(request, env, corsHeaders)
					case "/auth/create":
						return createUser(request, env, corsHeaders)

					default:
						return responseFailed(null, "Invalid api", 404, corsHeaders)
				}
			} else if (url.pathname.startsWith("/chat")) {
				const envAI = env.AI
				if (!envAI) {
					return responseError(null, "No ai environment found", 404, corsHeaders)
				}

				return fetchStreamChat(request, env, corsHeaders)
			} else if (url.pathname.startsWith("/api/")) {
				// const isValid = await isValidateToken(request, env)

				// if (!isValid) {
				// 	return responseError(null, "Unauthorized", 401, corsHeaders)
				// }

				// else if (url.pathname.startsWith("/api/")) {
				const db = env.DB_CHAT
				if (!db) {
					return responseError(null, "No db environment found", 404, corsHeaders)
				}

				if (menthod === "GET") {
					switch (path) {
						case "/api/chat-by-id":
							return getChatById(request, db, corsHeaders)
						case "/api/chat-by-userid":
							return getChatsByUserId(request, db, corsHeaders)
						case "/api/message-by-chatid":
							return getMessagesByChatId(request, db, corsHeaders)

						default:
							return responseFailed(null, "Invalid get api", 404, corsHeaders)
					}
				} else if (menthod === "POST") {
					switch (path) {
						case "/api/message":
							return saveMessage(request, db, corsHeaders)
						// case "/api/start-chat":
						// 	return startChat(request, db, corsHeaders)
						// case "/api/finish-chat":
						// 	return finishChat(request, db, corsHeaders)
						default:
							return responseFailed(null, "Invalid post api", 404, corsHeaders)
					}
				} else if (menthod === "DELETE") {
					switch (path) {
						case "/api/delete-chat":
							return deleteChat(request, db, corsHeaders)

						default:
							break;
					}
				}
			}

			return responseError(null, "Invalid api", 404, corsHeaders)
		} catch (err) {
			const errorMessage = err.message || "An unknown error occurred"
			console.log("Exception", err)
			return responseError(err, errorMessage, 500, corsHeaders)
		}
	},
}
