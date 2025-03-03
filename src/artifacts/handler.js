// api/src/artifacts/handler.js
import { textDocumentHandler } from "./text";
import { codeDocumentHandler } from "./code";
import { imageDocumentHandler } from "./image";
import { sheetDocumentHandler } from "./sheet";

export function createDocumentHandler(config) {
	return {
		kind: config.kind,
		onCreateDocument: async ({ id, title, dataStream, session }) => {
			try {
				const draftContent = await config.onCreateDocument({
					id,
					title,
					dataStream,
					session,
				})

				await saveToDatabase(session.env.DB_CHAT, {
					id,
					title,
					content: draftContent,
					userId: session.user.id,
					kind: config.kind,
				})

				return draftContent
			} catch (err) {
				console.error(`Create ${config.kind} document error:`, err)
				throw err
			}
		},
		onUpdateDocument: async ({ document, description, dataStream, session }) => {
			try {
				const draftContent = await config.onUpdateDocument({
					document,
					description,
					dataStream,
					session,
				})

				await updateInDatabase(session.env.DB_CHAT, {
					id: document.id,
					content: draftContent,
					userId: session.user.id,
				})

				return draftContent
			} catch (err) {
				console.error(`Update ${config.kind} document error:`, err)
				throw err
			}
		},
	}
}

async function saveToDatabase(db, { id, title, content, userId, kind }) {
	await db
		.prepare("INSERT INTO Document (id, title, content, userId, text, kind) VALUES (?, ?, ?, ?, ?, ?)")
		.bind(id, title, content, userId, content, kind)
		.run()
}

async function updateInDatabase(db, { id, content, userId }) {
	await db.prepare("UPDATE Document SET content = ?, text = ? WHERE id = ? AND userId = ?").bind(content, content, id, userId).run()
}

export const documentHandlersByArtifactKind = [
	textDocumentHandler,
	codeDocumentHandler,
	imageDocumentHandler,
	sheetDocumentHandler
];

export const artifactKinds = ["text", "code", "image", "sheet"];
