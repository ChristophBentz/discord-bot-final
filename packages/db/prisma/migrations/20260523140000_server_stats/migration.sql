-- AlterTable
ALTER TABLE "Config" ADD COLUMN "serverStatsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Config" ADD COLUMN "serverStatsCategoryId" TEXT;

-- CreateTable
CREATE TABLE "ServerStat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "nameTemplate" TEXT NOT NULL,
    "channelId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastValue" INTEGER,
    "lastUpdate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
