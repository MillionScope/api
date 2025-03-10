// export function responseSuccess(data, msg, corsHeaders) {
// 	return new Response(JSON.stringify({ success: true, error: null, msg, data }), {
// 		status: 200,
// 		headers: { "Content-Type": "application/json", ...corsHeaders },
// 	})
// }

// export function responseFailed(data, msg, status, corsHeaders) {
// 	return new Response(JSON.stringify({ success: false, error: null, msg, data }), {
// 		status: status,
// 		headers: { "Content-Type": "application/json", ...corsHeaders },
// 	})
// }

// export function responseError(error, msg, status, corsHeaders) {
// 	return new Response(JSON.stringify({ success: false, error: error, msg, data: null }), {
// 		status: status,
// 		headers: { "Content-Type": "application/json", ...corsHeaders },
// 	})
// }

export function responseSuccess(c, data, msg) {
	return c.json({ success: true, error: null, msg, data }, 200)
}

export function responseFailed(c, data, msg, status) {
	return c.json({ success: false, error: null, msg, data }, status)
}

export function responseError(c, error, msg, status) {
	return c.json({ success: false, error, msg, data: null }, status)
}
