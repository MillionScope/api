export async function handleLogout(c) {
	const response = new Response(JSON.stringify({ success: true }), {
		headers: { "Content-Type": "application/json" }
	})

	response.headers.set(
		"Set-Cookie",
		`auth-token=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`
	)

	return response
}
