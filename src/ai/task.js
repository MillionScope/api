import { generateText } from "ai"

export async function generateTitleFromUserMessage(workersai, message) {
	const { text: title } = await generateText({
		model: workersai('@cf/meta/llama-2-7b-chat-int8'),
		system: `\n
	  - you will generate a short title based on the first message a user begins a conversation with
	  - ensure it is not more than 80 characters long
	  - the title should be a summary of the user's message
	  - do not use quotes or colons
	  - do not wrap the title in quotes`,
		prompt: JSON.stringify(message),
	})

	return title.replace(/^["']|["']$/g, '') // Remove any quotes from start/end
}

// export async function createDocument({ dataStream }) {
// 	return async function({ title, content, userId }) {
// 		try {
// 			const db = session.env.DB_CHAT;
// 			if (!db) {
// 				throw new Error("Database not found");
// 			}

// 			// Insert the document
// 			await db.prepare(
// 				"INSERT INTO Document (title, content, userId, text) VALUES (?, ?, ?, ?)"
// 			)
// 			.bind(title, content, userId, content)
// 			.run();

// 			// Get the inserted document
// 			const { results } = await db.prepare(
// 				"SELECT * FROM Document WHERE userId = ? ORDER BY createdAt DESC LIMIT 1"
// 			)
// 			.bind(userId)
// 			.run();

// 			return results[0];
// 		} catch (err) {
// 			console.error("Create document error:", err);
// 			throw err;
// 		}
// 	};
// }

// export async function updateDocument({ session, dataStream }) {
// 	return async function({ id, createdAt, title, content, userId }) {
// 		try {
// 			const db = session.env.DB_CHAT;
// 			if (!db) {
// 				throw new Error("Database not found");
// 			}

// 			// Update the document
// 			await db.prepare(
// 				"UPDATE Document SET title = ?, content = ?, text = ? WHERE id = ? AND createdAt = ? AND userId = ?"
// 			)
// 			.bind(title, content, content, id, createdAt, userId)
// 			.run();

// 			// Get the updated document
// 			const { results } = await db.prepare(
// 				"SELECT * FROM Document WHERE id = ? AND createdAt = ?"
// 			)
// 			.bind(id, createdAt)
// 			.run();

// 			return results[0];
// 		} catch (err) {
// 			console.error("Update document error:", err);
// 			throw err;
// 		}
// 	};
// }
