-- CreateTable
CREATE TABLE "BlacklistedWord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "word" TEXT NOT NULL,
    "addedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "botStatusText" TEXT,
    "guildName" TEXT,
    "guildIconUrl" TEXT,
    "guildMemberCount" INTEGER NOT NULL DEFAULT 0,
    "logChannelId" TEXT,
    "logMessageDelete" BOOLEAN NOT NULL DEFAULT true,
    "logMessageEdit" BOOLEAN NOT NULL DEFAULT true,
    "logMemberJoin" BOOLEAN NOT NULL DEFAULT true,
    "logMemberLeave" BOOLEAN NOT NULL DEFAULT true,
    "logMemberBan" BOOLEAN NOT NULL DEFAULT true,
    "logMemberUnban" BOOLEAN NOT NULL DEFAULT true,
    "logMemberNickname" BOOLEAN NOT NULL DEFAULT true,
    "logMemberRoles" BOOLEAN NOT NULL DEFAULT true,
    "logVoice" BOOLEAN NOT NULL DEFAULT true,
    "welcomeChannelId" TEXT,
    "welcomeMessage" TEXT,
    "leaveChannelId" TEXT,
    "leaveMessage" TEXT,
    "muteRoleId" TEXT,
    "autoModEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoModDM" BOOLEAN NOT NULL DEFAULT true,
    "levelingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "levelUpChannelId" TEXT,
    "xpPerMessageMin" INTEGER NOT NULL DEFAULT 15,
    "xpPerMessageMax" INTEGER NOT NULL DEFAULT 25,
    "xpCooldownSeconds" INTEGER NOT NULL DEFAULT 60,
    "xpPerMinuteVoice" INTEGER NOT NULL DEFAULT 5,
    "achievementNotifyDM" BOOLEAN NOT NULL DEFAULT true,
    "achievementNotifyChannel" BOOLEAN NOT NULL DEFAULT false,
    "achievementChannelId" TEXT,
    "ticketCategoryId" TEXT,
    "ticketStaffRoleId" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Config" ("achievementChannelId", "achievementNotifyChannel", "achievementNotifyDM", "botStatusText", "guildIconUrl", "guildMemberCount", "guildName", "id", "leaveChannelId", "leaveMessage", "levelUpChannelId", "levelingEnabled", "logChannelId", "logMemberBan", "logMemberJoin", "logMemberLeave", "logMemberNickname", "logMemberRoles", "logMemberUnban", "logMessageDelete", "logMessageEdit", "logVoice", "muteRoleId", "ticketCategoryId", "ticketStaffRoleId", "updatedAt", "welcomeChannelId", "welcomeMessage", "xpCooldownSeconds", "xpPerMessageMax", "xpPerMessageMin", "xpPerMinuteVoice") SELECT "achievementChannelId", "achievementNotifyChannel", "achievementNotifyDM", "botStatusText", "guildIconUrl", "guildMemberCount", "guildName", "id", "leaveChannelId", "leaveMessage", "levelUpChannelId", "levelingEnabled", "logChannelId", "logMemberBan", "logMemberJoin", "logMemberLeave", "logMemberNickname", "logMemberRoles", "logMemberUnban", "logMessageDelete", "logMessageEdit", "logVoice", "muteRoleId", "ticketCategoryId", "ticketStaffRoleId", "updatedAt", "welcomeChannelId", "welcomeMessage", "xpCooldownSeconds", "xpPerMessageMax", "xpPerMessageMin", "xpPerMinuteVoice" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BlacklistedWord_word_key" ON "BlacklistedWord"("word");

-- CreateIndex
CREATE INDEX "BlacklistedWord_word_idx" ON "BlacklistedWord"("word");
