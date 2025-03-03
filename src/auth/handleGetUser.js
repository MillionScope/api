import { verify } from "@tsndr/cloudflare-worker-jwt"
import { responseError, responseFailed, responseSuccess } from "../response"
import { getCookie } from "../utils"

export async function handleGetUser(c) {
	const cookies = c.req.header("Cookie") || ""
	const session_token = getCookie(cookies, "auth-token")

	if (!session_token) {
		return responseFailed(c, null, "No token provided", 401)
	}

	try {
		const res = await verify(session_token, c.env.JWT_SECRET)
		if (res?.payload) {
			return responseSuccess(c, res.payload, "Authenticate successfully")
		} else {
			return responseFailed(c, null, "Invalid token", 401)
		}
	} catch (err) {
		const errorMessage = err.message || "An unknown error occurred"
		console.log("Exception", err)
		return responseError(c, err, errorMessage, 401)
	}
}
