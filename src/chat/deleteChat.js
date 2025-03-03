import { responseError, responseFailed, responseSuccess } from "../response"

export async function deleteChat(c) {
	try {
		const chatId = c.req.param('id')
		if (!chatId) {
			return responseFailed(c, null, "Chat ID is required", 400)
		}

		const db = c.env.DB_CHAT
		if (!db) {
			return responseFailed(c, null, "Database connection not found", 404)
		}

		// Delete votes first due to foreign key constraints
		await db.prepare("DELETE FROM Vote WHERE chatId = ?")
			.bind(chatId)
			.run()

		// Delete messages
		await db.prepare("DELETE FROM Message WHERE chatId = ?")
			.bind(chatId)
			.run()

		// Delete chat
		const { results } = await db.prepare("DELETE FROM Chat WHERE id = ?")
			.bind(chatId)
			.run()

		if (!results || results.length === 0) {
			return responseFailed(c, null, "Failed to delete chat", 500)
		}

		return responseSuccess(c, null, "Chat deleted successfully")
	} catch (err) {
		console.error("Exception:", err)
		return responseError(c, err.message || "An unknown error occurred", 500)
	}
}
