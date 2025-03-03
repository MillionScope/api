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
	cors({
		origin: (origin) => origin,
		allowMethods: ["GET", "HEAD", "POST", "OPTIONS", "PATCH"],
		allowHeaders: ["Content-Type"],
		credentials: true,
		maxAge: 86400,
	})
)

// Auth routes
app.get("/auth/callback/github", handleGithubCallback)
app.get("/auth/callback/google", handleGoogleCallback)
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
apiRoutes.use(
	`/api/${API_VERSION}`,
	cors({
		origin: (origin) => origin,
		allowMethods: ["GET", "HEAD", "POST", "OPTIONS", "PATCH"],
		allowHeaders: ["Content-Type"],
		credentials: true,
		maxAge: 86400,
	})
)

// Chat endpoints
apiRoutes.get("/chats", async (c) => {
	const userId = c.req.query('userid')
	return getChatsByUserId(c)
})
apiRoutes.get("/chats/:id", async (c) => {
	const chatId = c.req.param('id')
	return getChatById(c)
})
apiRoutes.delete("/chats/:id", async (c) => {
	const chatId = c.req.param('id')
	return deleteChat(c)
})
apiRoutes.get("/auth/user", handleGetUser)
apiRoutes.post("/auth/logout", handleLogout)

// Message endpoints
apiRoutes.get("/chats/:chatId/messages", async (c) => {
	const chatId = c.req.param('chatId')
	return getMessagesByChatId(c)
})
apiRoutes.post("/messages", saveMessage)

// Document endpoints (commented for reference)
// apiRoutes.get("/documents", getChatsByUserId)
// apiRoutes.post("/documents", saveMessage)
// apiRoutes.get("/documents/:id", getChatById)
// apiRoutes.delete('/documents/:id', async (c) => {
//   return responseSuccess(c, null, 'Document deleted successfully')
// })

app.route(`/api/${API_VERSION}`, apiRoutes)

// 404 handler
app.notFound((c) => responseFailed(c, null, "Invalid API endpoint", 404))

// Global error handler
app.onError((err, c) => {
	console.error("Exception:", err)
	return responseError(c, err.message || "An unknown error occurred", 500)
})

export default app
