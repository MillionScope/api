import { responseError, responseFailed, responseSuccess } from "../response"

export async function deleteChat(request, db, corsHeaders) {
	try {
		const { id } = await request.json()
		if (!id) {
			return responseFailed(null, "id not found", 400, corsHeaders)
		}

		const { results: voteResults } = await db.prepare("DELETE FROM Vote WHERE chatId = ?").bind(id).run()

		const { results: messageResults } = await db.prepare("DELETE FROM Message WHERE chatId = ?").bind(id).run()

		const { results: chatResults } = await db.prepare("DELETE FROM Chat WHERE chatId = ?").bind(id).run()

		return responseSuccess(chat, "Fetch chat success", corsHeaders)
	} catch (err) {
		console.error("Exception:", err)
		return responseError(err, err.message || "An unknown error occurred", 500, corsHeaders)
	}
}
