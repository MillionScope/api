CREATE TABLE User (
	id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
	email TEXT NOT NULL CHECK (length(email) <= 64),
	password TEXT CHECK (length(password) <= 64)
);
ALTER TABLE Chat
ADD CONSTRAINT Chat_userId_fk FOREIGN KEY (userId) REFERENCES User(id) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE IF NOT EXISTS Chat (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  title text NULL,
  messages TEXT NOT NULL,
  userId TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
)

CREATE INDEX IF NOT EXISTS idx_chat_userId ON Chat(userId);
-- Insert sample users
INSERT INTO User (id, email, password)
VALUES (
		lower(hex(randomblob(16))),
		'user1@example.com',
		'password123'
	),
	(
		lower(hex(randomblob(16))),
		'user2@example.com',
		'securepass456'
	);
-- Retrieve user IDs for inserting chats
WITH users AS (
	SELECT id
	FROM User
	LIMIT 2
)
INSERT INTO Chat (id, createdAt, messages, userId, visibility)
VALUES (
		lower(hex(randomblob(16))),
		datetime('now'),
		'{"text": "Hello, how are you?"}',
		(
			SELECT id
			FROM users
			LIMIT 1
		), 'private'
	), (
		lower(hex(randomblob(16))), datetime('now'), '{"text": "Hey! What’s up?"}', (
			SELECT id
			FROM users
			LIMIT 1 OFFSET 1
		),
		'public'
	);
