export async function handleLogout(request, env, corsHeaders) {
	const response = new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
	const secure = env.ENVIRONMENT === "development" ? "SameSite=Lax;" : "Secure; SameSite=None;"

	response.headers.set("Set-Cookie", `genea-auth-token=; Path=/; HttpOnly; ${secure} Max-Age=0`)

	return response
}
