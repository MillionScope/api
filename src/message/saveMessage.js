import { responseError, responseFailed, responseSuccess } from "../response"

export async function saveMessage(request, db, corsHeaders) {
	try {
		const { messages } = await request.json()
		if (!Array.isArray(messages) || messages.length === 0) {
			console.log("request", request)
			return responseFailed(null, "Invalid messages data", 400, corsHeaders)
		}

		const stmt = db.prepare("INSERT INTO Message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)")

		const batch = Array.from(messages).map((msg) => {
			return stmt.bind(msg.id, msg.chatId, msg.role, msg.content, msg.createdAt)
		})

		const batchResults = await db.batch(batch)
		if (!batchResults || !Array.isArray(batchResults) || batchResults.length === 0) {
			return responseFailed(null, "Failed to save messages", 500, corsHeaders)
		}

		const results = batchResults.map((item) => item.results)

		return responseSuccess(results, "Update message success", corsHeaders)
	} catch (err) {
		console.error("Exception:", err)
		return responseError(err, err.message || "An unknown error occurred", 500, corsHeaders)
	}
}
