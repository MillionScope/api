export function getCookie(cookieHeader, name) {
	if (!cookieHeader) return null
	const cookies = cookieHeader.split(';')
	for (const cookie of cookies) {
		const [cookieName, cookieValue] = cookie.trim().split('=')
		if (cookieName === name) {
			return cookieValue
		}
	}
	return null
}
