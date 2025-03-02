--
CREATE TABLE IF NOT EXISTS Document (
    id TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
    createdAt TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    userId TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT 'text',
    PRIMARY KEY (id, createdAt)
);

WITH users AS (SELECT id FROM User LIMIT 2)
INSERT INTO Document (id, createdAt, title, content, userId, text) VALUES
    (lower(hex(randomblob(16))), datetime('now'), 'Document 1', 'This is the content of document 1.', (SELECT id FROM users LIMIT 1), 'text'),
    (lower(hex(randomblob(16))), datetime('now'), 'Document 2', 'This is the content of document 2.', (SELECT id FROM users LIMIT 1 OFFSET 1), 'text');


-- Add foreign key constraint for Document -> User
CREATE TABLE IF NOT EXISTS Suggestion (
    id TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
    documentId TEXT NOT NULL,
    documentCreatedAt TEXT NOT NULL,
    originalText TEXT NOT NULL,
    suggestedText TEXT NOT NULL,
    description TEXT,
    isResolved BOOLEAN NOT NULL DEFAULT false,
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
);

PRAGMA foreign_keys = ON;

-- Retrieve document IDs for inserting suggestions
WITH docs AS (SELECT id, createdAt FROM Document LIMIT 2),
     users AS (SELECT id FROM User LIMIT 2)
INSERT INTO Suggestion (id, documentId, documentCreatedAt, originalText, suggestedText, description, isResolved, userId, createdAt) VALUES
    (lower(hex(randomblob(16))), (SELECT id FROM docs LIMIT 1), (SELECT createdAt FROM docs LIMIT 1),
     'Original text 1', 'Suggested text 1', 'Fix grammar mistake', false, (SELECT id FROM users LIMIT 1), datetime('now')),

    (lower(hex(randomblob(16))), (SELECT id FROM docs LIMIT 1 OFFSET 1), (SELECT createdAt FROM docs LIMIT 1 OFFSET 1),
     'Original text 2', 'Suggested text 2', 'Improve clarity', false, (SELECT id FROM users LIMIT 1 OFFSET 1), datetime('now'));
