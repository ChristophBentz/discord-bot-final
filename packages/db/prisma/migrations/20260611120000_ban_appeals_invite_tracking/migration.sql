-- CreateTable
CREATE TABLE "BanAppeal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "banReason" TEXT,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedById" TEXT,
    "decidedBy" TEXT,
    "decidedAt" DATETIME,
    "decisionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InviteUse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "inviterId" TEXT,
    "inviteCode" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomCommand" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL DEFAULT 'Custom-Command',
    "responseType" TEXT NOT NULL DEFAULT 'text',
    "response" TEXT NOT NULL DEFAULT '',
    "embedTitle" TEXT,
    "embedDescription" TEXT,
    "embedColor" INTEGER,
    "embedImageUrl" TEXT,
    "embedFooter" TEXT,
    "ephemeral" BOOLEAN NOT NULL DEFAULT false,
    "allowedRoleIds" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CustomCommand" ("allowedRoleIds", "createdAt", "createdBy", "description", "embedColor", "embedDescription", "embedFooter", "embedImageUrl", "embedTitle", "ephemeral", "name", "response", "responseType", "updatedAt") SELECT "allowedRoleIds", "createdAt", "createdBy", "description", "embedColor", "embedDescription", "embedFooter", "embedImageUrl", "embedTitle", "ephemeral", "name", "response", "responseType", "updatedAt" FROM "CustomCommand";
DROP TABLE "CustomCommand";
ALTER TABLE "new_CustomCommand" RENAME TO "CustomCommand";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BanAppeal_userId_idx" ON "BanAppeal"("userId");

-- CreateIndex
CREATE INDEX "BanAppeal_status_idx" ON "BanAppeal"("status");

-- CreateIndex
CREATE INDEX "InviteUse_userId_idx" ON "InviteUse"("userId");

-- CreateIndex
CREATE INDEX "InviteUse_inviterId_idx" ON "InviteUse"("inviterId");

