export function getMostRecentUserMessage(messages) {
	const userMessages = messages.filter((message) => message.role === "user")
	return userMessages.at(-1)
}
