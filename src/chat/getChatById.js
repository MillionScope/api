import { responseError, responseFailed, responseSuccess } from "../response"

export async function getChatById(c) {
	try {
		const chatId = c.req.param('id')

		if (!chatId) {
			return responseFailed(c, null, "Chat ID is required", 400)
		}

		const db = c.env.DB_CHAT
		if (!db) {
			return responseFailed(c, null, "Database connection not found", 404)
		}

		const { results } = await db
			.prepare("SELECT * FROM Chat WHERE id = ?")
			.bind(chatId)
			.run()

		if (!results || results.length === 0) {
			return responseFailed(c, null, "No chat found", 404)
		}

		return responseSuccess(c, results, "Fetch chat success")
	} catch (err) {
		console.error("Exception:", err)
		return responseError(c, err.message || "An unknown error occurred", 500)
	}
}
