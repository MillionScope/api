CREATE TABLE User (
	id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
	email TEXT NOT NULL CHECK (length(email) <= 64),
	password TEXT CHECK (length(password) <= 64)
);

CREATE TABLE IF NOT EXISTS Chat (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  title text NULL,
  messages TEXT NOT NULL,
  userId TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
)
CREATE INDEX IF NOT EXISTS idx_chat_userId ON Chat(userId);


--
CREATE TABLE IF NOT EXISTS Document (
    id TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    content TEXT,
    userId TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT 'text',
    PRIMARY KEY (id, createdAt)
);

--
CREATE TABLE IF NOT EXISTS Suggestion (
    id TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
    documentId TEXT NOT NULL,
    documentCreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    originalText TEXT NOT NULL,
    suggestedText TEXT NOT NULL,
    description TEXT,
    isResolved BOOLEAN NOT NULL DEFAULT false,
    userId TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

--
CREATE TABLE IF NOT EXISTS Message (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
    chatId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatId) REFERENCES Chat(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

--
CREATE TABLE IF NOT EXISTS Vote (
    chatId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    isUpvoted BOOLEAN NOT NULL,
    PRIMARY KEY (chatId, messageId),
    FOREIGN KEY (chatId) REFERENCES Chat(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (messageId) REFERENCES Message(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);
