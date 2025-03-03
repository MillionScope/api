import { responseError, responseFailed, responseSuccess } from "../response"

export async function getChatsByUserId(c) {
	try {
		console.log("getChatsByUserId")
		const userid = c.req.query('userid')
		if (!userid) {
			console.log("request", c.req)
			return responseFailed(c, null, "userid not found", 400)
		}

		const { results: chat } = await c.env.DB_CHAT.prepare("SELECT * FROM Chat WHERE userId = ? ORDER BY createdAt DESC").bind(userid).all()

		if (!chat || chat.length === 0) {
			return responseFailed(c, null, "No chat found", 404)
		}

		return responseSuccess(c, chat, "Fetch chat success")
	} catch (err) {
		console.error("Exception:", err)
		return responseError(c, err.message || "An unknown error occurred", "Error fetching chats", 500)
	}
}
