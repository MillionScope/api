import { responseError, responseFailed, responseSuccess } from "../response"

export async function createUser(request, env, corsHeaders) {
	try {
		const { email, password } = await request.json()
		if (!email || !password) {
			return responseFailed(null, "Missing email, password param in request", 400, corsHeaders)
		}

		const salt = genSaltSync(10)
		const hash = hashSync(password, salt)

		const { results: user } = await env.DB.prepare("INSERT INTO user (email, password) VALUES (?, ?)").bind(email, hash).run()
		if (!user || user.length === 0) {
			return responseFailed(null, "Failed to create user", 500, corsHeaders)
		}

		return responseSuccess(user, "Create user success", corsHeaders)
	} catch (err) {
		const errorMessage = err.message || "An unknown error occurred"
		console.log("Exception", err)
		return responseError(err, errorMessage, 401, corsHeaders)
	}
}
