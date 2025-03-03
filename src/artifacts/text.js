import { textDocumentHandler } from "./text.js";
import { codeDocumentHandler } from "./code.js";
import { imageDocumentHandler } from "./image.js";
import { sheetDocumentHandler } from "./sheet.js";

/**
 * Creates a document handler for a specific artifact type
 * @param {Object} config Configuration object
 * @param {string} config.kind - The kind of artifact ('text', 'code', 'image', 'sheet')
 * @param {Function} config.onCreateDocument - Function to handle document creation
 * @param {Function} config.onUpdateDocument - Function to handle document updates
 */
export function createDocumentHandler(config) {
  return {
    kind: config.kind,
    onCreateDocument: async ({ id, title, dataStream, session }) => {
      try {
        const db = session.env.DB_CHAT;
        if (!db) throw new Error("Database not found");

        const draftContent = await config.onCreateDocument({
          id,
          title,
          dataStream,
          session,
        });

        // Save to database
        await db.prepare(
          "INSERT INTO Document (id, title, content, userId, text) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(id, title, draftContent, session.user.id, draftContent)
        .run();

        return draftContent;
      } catch (err) {
        console.error("Create document error:", err);
        throw err;
      }
    },
    onUpdateDocument: async ({ document, description, dataStream, session }) => {
      try {
        const db = session.env.DB_CHAT;
        if (!db) throw new Error("Database not found");

        const draftContent = await config.onUpdateDocument({
          document,
          description,
          dataStream,
          session,
        });

        // Update in database
        await db.prepare(
          "UPDATE Document SET content = ?, text = ? WHERE id = ? AND userId = ?"
        )
        .bind(draftContent, draftContent, document.id, session.user.id)
        .run();

        return draftContent;
      } catch (err) {
        console.error("Update document error:", err);
        throw err;
      }
    },
  };
}

export const documentHandlersByArtifactKind = [
  textDocumentHandler,
  codeDocumentHandler,
  imageDocumentHandler,
  sheetDocumentHandler,
];

export const artifactKinds = ["text", "code", "image", "sheet"];
