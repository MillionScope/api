import { sign } from "@tsndr/cloudflare-worker-jwt"
import { responseFailed } from "../response"

export async function handleGithubCallback(request, env, corsHeaders) {
	const url = new URL(request.url)
	const code = url.searchParams.get("code")

	if (!code) {
		return responseFailed(null, "No code provided", 400, corsHeaders)
	}

	console.log("env", env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, code)

	// Exchange code for access token
	const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
			code,
		}),
	})

	// Check if token response is OK
	if (!tokenResponse.ok) {
		const errorText = await tokenResponse.text()
		console.error("GitHub Token Error:", errorText)
		return responseFailed(null, `GitHub token request failed: ${errorText}`, 400, corsHeaders)
	}

	const tokenData = await tokenResponse.json()
	console.log("tokenData", JSON.stringify(tokenData))

	if (!tokenData.access_token) {
		return responseFailed(null, `Invalid GitHub OAuth response: ${JSON.stringify(tokenData)}`, 400, corsHeaders)
	}

	// Get user data from GitHub
	const userResponse = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`,
			Accept: "application/json",
			"User-Agent": '"Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)"',
		},
	})

	if (!userResponse.ok) {
		const errorText = await userResponse.text()
		console.error("GitHub API Error:", userResponse.status, errorText)
		return responseFailed(null, `GitHub API Error: ${userResponse.status} - ${errorText}`, userResponse.status, corsHeaders)
	}

	const userData = await userResponse.json()
	if (!userData) {
		console.log("userData", JSON.stringify(userData))
		return responseFailed(null, "Failed to get Github user", 500, corsHeaders)
	}

	// if (!userData) {
	// 	// If user does not exist, insert new user and account
	// 	const db = env.DB_HEMVIP
	// 	if (!db) {
	// 		return responseFailed(null, "No database found", 404, corsHeaders)
	// 	}

	// 	console.log(" userData.email", userData.email)
	// 	const respUser = await db
	// 		.prepare("INSERT INTO users (name, username, email, avatar, exp, githubid) VALUES (?, ?, ?, ?, ?, ?)")
	// 		.bind(userData.name, userData.login, userData.email, userData.avatar_url, expiredDate, githubid)
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
	// 		.bind(tokenData.access_token, "read:user,user:email", "bearer", githubid, "github", "oauth", useridInserted)
	// 		.run()

	// 	if (!respAccount) {
	// 		console.log("respAccount", respAccount)
	// 		return responseFailed(null, "Failed to create accounts", 500, corsHeaders)
	// 	}
	// }

	const expiredDate = Math.floor(Date.now() / 1000) + 24 * 60 * 60
	const githubid = userData.id.toString()

	if (!githubid) {
		console.error("GitHub user is null or undefined")
		return responseFailed(null, "GitHub user is null or undefined", 400, corsHeaders)
	}

	// *********************** Create JWT token ***********************
	const session_token = await sign(
		{
			userid: githubid,
			username: userData.login,
			email: userData.email,
			name: userData.name,
			avatar: userData.avatar_url,
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
