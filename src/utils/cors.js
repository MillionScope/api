export function configureCors(request, env) {
	const allowedOrigins = [env.ALLOWED_ORIGIN, env.ALLOWED_ORIGIN2, env.ALLOWED_ORIGIN3]
	const origin = request.headers.get("Origin")

	const corsHeaders = {
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Allow-Credentials": "true",
		"Access-Control-Max-Age": "86400",
	}

	if (origin && allowedOrigins.includes(origin)) {
		corsHeaders["Access-Control-Allow-Origin"] = origin
	}

	return corsHeaders
}
