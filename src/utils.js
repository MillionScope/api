export function getCookie(cookieHeader, name) {
	if (!cookieHeader) return null
	const cookies = cookieHeader.split(";")
	for (const cookie of cookies) {
		const [cookieName, cookieValue] = cookie.trim().split("=")
		if (cookieName === name) {
			return cookieValue
		}
	}
	return null
}

export function generateUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
	  const r = (Math.random() * 16) | 0;
	  const v = c === 'x' ? r : (r & 0x3) | 0x8;
	  return v.toString(16);
	});
  }
