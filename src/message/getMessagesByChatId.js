import { responseSuccess, responseFailed } from "../response"

/**
 * @swagger
 * /api/v1/chats/{id}/messages:
 *   get:
 *     summary: Get all messages for a specific chat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The chat ID
 *     responses:
 *       200:
 *         description: List of messages for the chat
 *       400:
 *         description: Invalid chat ID
 *       404:
 *         description: Chat not found
 */
export async function getMessagesByChatId(c) {
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
			.prepare("SELECT * FROM Message WHERE chatId = ? ORDER BY createdAt ASC")
			.bind(chatId)
			.run()

		if (!results || results.length === 0) {
			return responseSuccess(c, [], "No messages found for this chat")
		}

		return responseSuccess(c, results, "Messages retrieved successfully")
	} catch (error) {
		console.error("Error getting messages:", error)
		return responseFailed(c, null, "Failed to get messages", 500)
	}
}
