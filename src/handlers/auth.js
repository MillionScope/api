import { sign } from "@tsndr/cloudflare-worker-jwt"
import { responseSuccess, responseFailed, responseError } from "../utils/response"

export async function handleGithubCallback(request, env, corsHeaders) {
	const url = new URL(request.url)
	const code = url.searchParams.get("code")

	if (!code) {
		return responseFailed(null, "Authorization code not found", 400, corsHeaders)
	}

	// Exchange code for access token
	const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: `${url.origin}/auth/callback/github`,
		}),
	})

	const tokenData = await tokenResponse.json()
	if (!tokenData.access_token) {
		return responseFailed(null, "Invalid GitHub OAuth response", 400, corsHeaders)
	}

	// Get user data
	const userResponse = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`,
		},
	})

	const userData = await userResponse.json()
	if (!userResponse.ok) {
		return responseFailed(null, "Failed to fetch user data", 400, corsHeaders)
	}

	// Generate JWT token
	const token = await sign(
		{
			userId: userData.id,
			name: userData.name,
			email: userData.email,
		},
		env.JWT_SECRET
	)

	return responseSuccess({ token, user: userData }, "Successfully authenticated", 200, corsHeaders)
}

export async function handleGoogleCallback(request, env, corsHeaders) {
	const url = new URL(request.url)
	const code = url.searchParams.get("code")

	if (!code) {
		return responseFailed(null, "Authorization code not found", 400, corsHeaders)
	}

	const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			code,
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			redirect_uri: `${url.origin}/auth/callback/google`,
			grant_type: "authorization_code",
		}),
	})

	const tokenData = await tokenResponse.json()
	if (!tokenData.access_token) {
		return responseFailed(null, "Invalid Google OAuth response", 400, corsHeaders)
	}

	const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`,
		},
	})

	const userData = await userInfoResponse.json()
	if (!userInfoResponse.ok) {
		return responseFailed(null, "Failed to fetch user data", 400, corsHeaders)
	}

	const token = await sign(
		{
			userId: userData.id,
			name: userData.name,
			email: userData.email,
		},
		env.JWT_SECRET
	)

	return responseSuccess({ token, user: userData }, "Successfully authenticated", 200, corsHeaders)
}

export async function handleGetUser(request, env, corsHeaders) {
	// Get token from Authorization header
	const authHeader = request.headers.get("Authorization")
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return responseFailed(null, "No authorization token provided", 401, corsHeaders)
	}

	const token = authHeader.split(" ")[1]
	try {
		const decoded = await verify(token, env.JWT_SECRET)
		return responseSuccess({ user: decoded }, "User data retrieved", 200, corsHeaders)
	} catch (error) {
		return responseFailed(null, "Invalid token", 401, corsHeaders)
	}
}

export async function handleLogout(request, env, corsHeaders) {
	// Clear token logic here if needed
	return responseSuccess(null, "Successfully logged out", 200, corsHeaders)
}

export async function createUser(request, env, corsHeaders) {
	try {
		const { name, email, password } = await request.json()

		if (!name || !email || !password) {
			return responseFailed(null, "Missing required fields", 400, corsHeaders)
		}

		const db = env.DB_CHAT
		if (!db) {
			return responseFailed(null, "Database not found", 404, corsHeaders)
		}

		// Check if user already exists
		const existingUser = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first()

		if (existingUser) {
			return responseFailed(null, "User already exists", 400, corsHeaders)
		}

		// Create new user
		await db
			.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
			.bind(name, email, password) // Note: In production, password should be hashed
			.run()

		return responseSuccess(null, "User created successfully", 201, corsHeaders)
	} catch (error) {
		return responseFailed(null, "Failed to create user", 500, corsHeaders)
	}
}

export async function handleLogin(request, env, corsHeaders) {
	try {
		const { email, password } = await request.json()

		if (!email || !password) {
			return responseFailed(null, "Email and password are required", 400, corsHeaders)
		}

		const db = env.DB_CHAT
		if (!db) {
			return responseFailed(null, "Database not found", 404, corsHeaders)
		}

		// Find user by email
		const user = await db.prepare("SELECT * FROM User WHERE email = ?").bind(email).first()

		if (!user || user.password !== password) { // Note: In production, use proper password comparison
			return responseFailed(null, "Invalid credentials", 401, corsHeaders)
		}

		// Generate JWT token
		const token = await sign(
			{
				userId: user.id,
				name: user.name,
				email: user.email,
			},
			env.JWT_SECRET
		)

		return responseSuccess({ token, user }, "Login successful", 200, corsHeaders)
	} catch (error) {
		return responseFailed(null, "Login failed", 500, corsHeaders)
	}
}

export async function handleSignup(request, env, corsHeaders) {
	return createUser(request, env, corsHeaders)
}
