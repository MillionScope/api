import { responseSuccess, responseFailed } from "../utils/response"
import { verify } from "@tsndr/cloudflare-worker-jwt"

export async function handleDocumentRoutes(path, method, request, env, corsHeaders) {
	const API_VERSION = "/v1"

	// Verify authentication for all document routes
	const authHeader = request.headers.get("Authorization")
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return responseFailed(null, "No authorization token provided", 401, corsHeaders)
	}

	const token = authHeader.split(" ")[1]
	try {
		await verify(token, env.JWT_SECRET)
	} catch (error) {
		return responseFailed(null, "Invalid token", 401, corsHeaders)
	}

	const routes = {
		POST: {
			[`${API_VERSION}/documents`]: () => createDocument(request, env, corsHeaders),
			[`${API_VERSION}/documents/:id`]: () => updateDocument(request, env, corsHeaders),
		},
		GET: {
			[`${API_VERSION}/documents`]: () => getDocuments(request, env, corsHeaders),
			[`${API_VERSION}/documents/:id`]: () => getDocument(request, env, corsHeaders),
		},
		DELETE: {
			[`${API_VERSION}/documents/:id`]: () => deleteDocument(request, env, corsHeaders),
		}
	}

	return routes[method]?.[path]?.() || responseFailed(null, "Invalid document endpoint", 404, corsHeaders)
}

export async function listDocuments(request, env, corsHeaders) {
	try {
		const db = env.DB_CHAT
		if (!db) {
			return responseFailed(null, "Database not found", 404, corsHeaders)
		}

		const documents = await db
			.prepare("SELECT * FROM documents WHERE user_id = ?")
			.bind(request.user.userId)
			.all()

		return responseSuccess({ documents }, "Documents retrieved successfully", 200, corsHeaders)
	} catch (error) {
		return responseFailed(null, "Failed to get documents", 500, corsHeaders)
	}
}

export async function uploadDocument(request, env, corsHeaders) {
	try {
		const { title, content } = await request.json()
		if (!title || !content) {
			return responseFailed(null, "Title and content are required", 400, corsHeaders)
		}

		const db = env.DB_CHAT
		if (!db) {
			return responseFailed(null, "Database not found", 404, corsHeaders)
		}

		await db
			.prepare("INSERT INTO documents (user_id, title, content) VALUES (?, ?, ?)")
			.bind(request.user.userId, title, content)
			.run()

		return responseSuccess(null, "Document created successfully", 201, corsHeaders)
	} catch (error) {
		return responseFailed(null, "Failed to create document", 500, corsHeaders)
	}
}

export async function getDocument(documentId, env, corsHeaders) {
	try {
		const db = env.DB_CHAT
		if (!db) {
			return responseFailed(null, "Database not found", 404, corsHeaders)
		}

		const document = await db
			.prepare("SELECT * FROM documents WHERE id = ? AND user_id = ?")
			.bind(documentId, request.user.userId)
			.first()

		if (!document) {
			return responseFailed(null, "Document not found", 404, corsHeaders)
		}

		return responseSuccess({ document }, "Document retrieved successfully", 200, corsHeaders)
	} catch (error) {
		return responseFailed(null, "Failed to get document", 500, corsHeaders)
	}
}

async function getDocuments(request, env, corsHeaders) {
	try {
		const db = env.DB_CHAT
		if (!db) {
			return responseFailed(null, "Database not found", 404, corsHeaders)
		}

		const documents = await db
			.prepare("SELECT * FROM documents WHERE user_id = ?")
			.bind(request.user.userId)
			.all()

		return responseSuccess({ documents }, "Documents retrieved successfully", 200, corsHeaders)
	} catch (error) {
		return responseFailed(null, "Failed to get documents", 500, corsHeaders)
	}
}

async function updateDocument(request, env, corsHeaders) {
	try {
		const url = new URL(request.url)
		const id = url.pathname.split("/").pop()
		const { title, content } = await request.json()

		if (!title && !content) {
			return responseFailed(null, "Title or content is required", 400, corsHeaders)
		}

		const db = env.DB_CHAT
		if (!db) {
			return responseFailed(null, "Database not found", 404, corsHeaders)
		}

		const result = await db
			.prepare("UPDATE documents SET title = COALESCE(?, title), content = COALESCE(?, content) WHERE id = ? AND user_id = ?")
			.bind(title, content, id, request.user.userId)
			.run()

		if (result.changes === 0) {
			return responseFailed(null, "Document not found", 404, corsHeaders)
		}

		return responseSuccess(null, "Document updated successfully", 200, corsHeaders)
	} catch (error) {
		return responseFailed(null, "Failed to update document", 500, corsHeaders)
	}
}

export async function deleteDocument(documentId, env, corsHeaders) {
	try {
		const db = env.DB_CHAT
		if (!db) {
			return responseFailed(null, "Database not found", 404, corsHeaders)
		}

		const result = await db
			.prepare("DELETE FROM documents WHERE id = ? AND user_id = ?")
			.bind(documentId, request.user.userId)
			.run()

		if (result.changes === 0) {
			return responseFailed(null, "Document not found", 404, corsHeaders)
		}

		return responseSuccess(null, "Document deleted successfully", 200, corsHeaders)
	} catch (error) {
		return responseFailed(null, "Failed to delete document", 500, corsHeaders)
	}
}
