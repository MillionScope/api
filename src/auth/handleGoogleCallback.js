import { sign } from "@tsndr/cloudflare-worker-jwt"
import { responseFailed } from "../response"

export async function handleGoogleCallback(request, env, corsHeaders) {
	const url = new URL(request.url)
	const code = url.searchParams.get("code")

	if (!code) {
		return responseFailed(null, "Authorization code not found", 400, corsHeaders)
	}

	console.log("GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, code, env.ALLOWED_ORIGIN)

	// ~~~~~~~~~~~~~ VERIFY TO GET TOKEN ~~~~~~~~~~~~~
	const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			code,
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			redirect_uri: env.ALLOWED_ORIGIN,
			grant_type: "authorization_code",
		}),
	})

	if (!tokenResponse.ok) {
		console.log("tokenResponse", tokenResponse)
		console.log("Failed to exchange authorization code", code)
		return responseFailed(null, `Failed to exchange authorization code ${code}`, 400, corsHeaders)
	}

	// ~~~~~~~~~~~~~ GET TOKEN ~~~~~~~~~~~~~
	const tokenData = await tokenResponse.json()
	if (!tokenData.access_token) {
		return responseFailed(null, `Invalid Google OAuth response: ${JSON.stringify(tokenData)}`, 400, corsHeaders)
	}
	console.log("tokenData", JSON.stringify(tokenData))

	// ~~~~~~~~~~~~~ GET USER INFO ~~~~~~~~~~~~~
	const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`,
		},
	})

	const userInfo = await userInfoResponse.json()
	if (!userInfoResponse.ok) {
		console.error("Failed to fetch user info:", userInfo)
		return responseFailed(null, `Failed to fetch user information: ${JSON.stringify(userInfo)}`, 400, corsHeaders)
	}
	console.log("userInfo", JSON.stringify(userInfo))

	// if (!userData) {
	// 	// If user does not exist, insert new user and account
	// 	const db = env.DB_HEMVIP
	// 	if (!db) {
	// 		return responseFailed(null, "No database found", 404, corsHeaders)
	// 	}

	// 	console.log(" userData.email", userData.email)
	// 	const respUser = await db
	// 		.prepare("INSERT INTO users (name, username, email, avatar, exp, Googleid) VALUES (?, ?, ?, ?, ?, ?)")
	// 		.bind(userData.name, userData.login, userData.email, userData.avatar_url, expiredDate, Googleid)
	// 		.run()
	// 	if (!respUser) {
	// 		console.log("respUser", respUser)
	// 		return responseFailed(null, "Failed to create user", 500, corsHeaders)
	// 	}

	// 	const idQuery = await db.prepare("SELECT last_insert_rowid() as id").first()
	// 	let useridInserted = idQuery?.id

	// 	const respAccount = await db
	// 		.prepare(
	// 			"INSERT INTO accounts (access_token, scope, token_type, providerAccountId, provider, type, userId) VALUES (?, ?, ?, ?, ?, ?, ?)"
	// 		)
	// 		.bind(tokenData.access_token, "read:user,user:email", "bearer", Googleid, "Google", "oauth", useridInserted)
	// 		.run()

	// 	if (!respAccount) {
	// 		console.log("respAccount", respAccount)
	// 		return responseFailed(null, "Failed to create accounts", 500, corsHeaders)
	// 	}
	// }

	const expiredDate = Math.floor(Date.now() / 1000) + 24 * 60 * 60
	const googleid = userInfo.id.toString()

	if (!googleid) {
		console.error("Google user is null or undefined")
		return responseFailed(null, "Google user is null or undefined", 400, corsHeaders)
	}

	// *********************** Create JWT token ***********************
	const session_token = await sign(
		{
			userid: userInfo.localId,
			username: userInfo.screenName,
			email: userInfo.email,
			name: userInfo.displayName,
			avatar: userInfo.picture,
			exp: expiredDate,
		},
		env.JWT_SECRET
	)

	// const respSession = await db
	// 	.prepare("INSERT INTO sessions (session_token, user_id, expires) VALUES (?, ?, ?)")
	// 	.bind(session_token, useridInserted, expiredDate)
	// 	.run()
	// if (respSession.changes !== 1) {
	// 	console.log("respSession", respSession)
	// 	return responseFailed(null, "Failed to create session", 500, corsHeaders)
	// }

	// Create a new response with the updated headers
	const response = Response.redirect(`${env.ALLOWED_ORIGIN}/`, 302)

	// Set the Set-Cookie header using the correct method
	const responseWithCookie = new Response(response.body, response)
	responseWithCookie.headers.set(
		"Set-Cookie",
		`auth-token=${session_token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${24 * 60 * 60}`
	)

	return responseWithCookie
}
