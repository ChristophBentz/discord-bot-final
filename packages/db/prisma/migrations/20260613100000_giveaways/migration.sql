-- AlterTable Member (Giveaway-Privatsphäre)
ALTER TABLE "Member" ADD COLUMN "giveawayShowEntries" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Member" ADD COLUMN "giveawayShowWins" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Member" ADD COLUMN "giveawayWinDm" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Giveaway" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "prize" TEXT NOT NULL,
    "description" TEXT,
    "winnerCount" INTEGER NOT NULL DEFAULT 1,
    "hostId" TEXT NOT NULL,
    "minLevel" INTEGER,
    "requiredRoleId" TEXT,
    "minMemberDays" INTEGER,
    "endsAt" DATETIME NOT NULL,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GiveawayEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "giveawayId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GiveawayEntry_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Giveaway_ended_endsAt_idx" ON "Giveaway"("ended", "endsAt");
CREATE INDEX "GiveawayEntry_userId_idx" ON "GiveawayEntry"("userId");
CREATE UNIQUE INDEX "GiveawayEntry_giveawayId_userId_key" ON "GiveawayEntry"("giveawayId", "userId");
