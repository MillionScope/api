CREATE TABLE IF NOT EXISTS Message (
    id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
    chatId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (chatId) REFERENCES Chat(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);


CREATE TABLE IF NOT EXISTS Vote (
    chatId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    isUpvoted BOOLEAN NOT NULL,
    PRIMARY KEY (chatId, messageId),
    FOREIGN KEY (chatId) REFERENCES Chat(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (messageId) REFERENCES Message(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

PRAGMA foreign_keys = ON;



-- Retrieve chat IDs for inserting messages
WITH chats AS (SELECT id FROM Chat LIMIT 2)
INSERT INTO Message (id, chatId, role, content, createdAt) VALUES
    (lower(hex(randomblob(16))), (SELECT id FROM chats LIMIT 1), 'user', '{"text": "Hello, how are you?"}', datetime('now')),
    (lower(hex(randomblob(16))), (SELECT id FROM chats LIMIT 1 OFFSET 1), 'bot', '{"text": "I am fine, thank you!"}', datetime('now'));


