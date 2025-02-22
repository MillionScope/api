import { responseError, responseFailed, responseSuccess } from "../response"

export async function getMessagesByChatId(request, db, corsHeaders) {
	try {
		const url = new URL(request.url)
		const id = url.searchParams.get("id") || ""
		if (!id) {
			return responseFailed(null, "id not found", 400, corsHeaders)
		}

		const { results: chat } = await db.prepare("SELECT * FROM chat WHERE userId = ? ORDER BY createdAt DESC").bind(userid).all()

		if (!chat || chat.length === 0) {
			return responseFailed(null, "No chat found", 404, corsHeaders)
		}

		return responseSuccess(chat, "Fetch chat success", corsHeaders)
	} catch (err) {
		console.error("Exception:", err)
		return responseError(err, err.message || "An unknown error occurred", 500, corsHeaders)
	}
}
