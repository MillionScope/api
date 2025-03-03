import { Hono } from "hono"
import { cors } from "hono/cors"
import { responseSuccess, responseFailed, responseError } from "./response"
import { fetchStreamChat } from "./chat/fetchStreamChat"
import { handleGithubCallback } from "./auth/handleGithubCallback"
import { handleGetUser } from "./auth/handleGetUser"
import { handleLogout } from "./auth/handleLogout"
import { getChatById } from "./chat/getChatById"
import { getChatsByUserId } from "./chat/getChatsByUserId"
import { saveMessage } from "./message/saveMessage"
import { getMessagesByChatId } from "./message/getMessagesByChatId"
import { createUser } from "./auth/createUser"
import { handleGoogleCallback } from "./auth/handleGoogleCallback"
import { deleteChat } from "./chat/deleteChat"
import { API_VERSION } from "./config/constant"

const app = new Hono()

// Middleware for CORS
app.use(
	"*",
	cors((c) => {
		const allowedOrigins = [c.env.ALLOWED_ORIGIN, c.env.ALLOWED_ORIGIN2, c.env.ALLOWED_ORIGIN3]
		const origin = c.req.header("Origin")
		console.log("origin", origin)
		return {
			origin: allowedOrigins.includes(origin) ? origin : "abc",
			allowMethods: ["GET", "HEAD", "POST", "OPTIONS", "PATCH"],
			allowHeaders: ["Content-Type"],
			credentials: true,
			maxAge: 86400,
		}
	})
)

// Auth routes
app.post("/auth/callback/github", handleGithubCallback)
app.post("/auth/callback/google", handleGoogleCallback)
app.get("/auth/user", handleGetUser)
app.post("/auth/logout", handleLogout)
app.post("/auth/create", createUser)

// Chat routes
app.post("/chat", async (c) => {
	if (!c.env.AI) {
		return responseError(c, "No AI environment found", 404)
	}
	return fetchStreamChat(c)
})

// Document API routes
const apiRoutes = new Hono()

// Chat endpoints
// console.log("getChat")
apiRoutes.get("/chats", async (c) => {

	return getChatsByUserId(c)
})
apiRoutes.get("/chats/:id", getChatById)
apiRoutes.delete("/chats/:id", deleteChat)

// Message endpoints
apiRoutes.get("/chats/:chatId/messages", getMessagesByChatId)
apiRoutes.post("/messages", saveMessage)

// apiRoutes.get("/documents", getChatsByUserId)
// apiRoutes.post("/documents", saveMessage)
// apiRoutes.get("/documents/:id", getChatById)
// apiRoutes.delete('/documents/:id', async (c) => {
//   return responseSuccess(c, null, 'Document deleted successfully')
// }

app.route(`/api/${API_VERSION}`, apiRoutes)

// 404 handler
app.notFound((c) => responseFailed(c, null, "Invalid API endpoint", 404))

// Global error handler
app.onError((err, c) => {
	console.error("Exception:", err)
	return responseError(c, err.message || "An unknown error occurred", 500)
})

export default app
