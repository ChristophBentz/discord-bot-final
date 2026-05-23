-- CreateTable
CREATE TABLE "RssFeed" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "pingRoleId" TEXT,
    "intervalMin" INTEGER NOT NULL DEFAULT 15,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheck" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RssFeedItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feedId" INTEGER NOT NULL,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT,
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT,
    CONSTRAINT "RssFeedItem_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "RssFeed" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RssFeedItem_feedId_guid_key" ON "RssFeedItem"("feedId", "guid");

-- CreateIndex
CREATE INDEX "RssFeedItem_feedId_postedAt_idx" ON "RssFeedItem"("feedId", "postedAt");
