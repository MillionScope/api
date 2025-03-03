import { responseError, responseFailed, responseSuccess } from "../response"

export async function saveMessage(c) {
	try {
		const chatId = c.req.param('id')
		if (!chatId) {
			return responseFailed(c, null, "Chat ID is required", 400)
		}

		const { messages } = await c.req.json()
		if (!Array.isArray(messages) || messages.length === 0) {
			console.log("request", c.req)
			return responseFailed(c, null, "Invalid messages data", 400)
		}

		const db = c.env.DB_CHAT
		if (!db) {
			return responseFailed(c, null, "Database connection not found", 404)
		}

		const stmt = db.prepare("INSERT INTO Message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)")

		const batch = Array.from(messages).map((msg) => {
			return stmt.bind(msg.id, chatId, msg.role, msg.content, msg.createdAt)
		})

		const batchResults = await db.batch(batch)
		if (!batchResults || !Array.isArray(batchResults) || batchResults.length === 0) {
			return responseFailed(c, null, "Failed to save messages", 500)
		}

		const results = batchResults.map((item) => item.results)

		return responseSuccess(c, results, "Update message success")
	} catch (err) {
		console.error("Exception:", err)
		return responseError(c, err.message || "An unknown error occurred", 500)
	}
}
