CREATE TABLE IF NOT EXISTS "Chat" (
    "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "createdAt" TIMESTAMP NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "chatId" TEXT NOT NULL,
    "role" VARCHAR NOT NULL,
    "content" JSON NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "Vote" (
    "chatId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "isUpvoted" BOOLEAN NOT NULL,
    PRIMARY KEY ("chatId", "messageId"),
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
