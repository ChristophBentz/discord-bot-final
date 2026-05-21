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
    "welcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "welcomeChannelId" TEXT,
    "welcomeMessage" TEXT,
    "leaveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "leaveChannelId" TEXT,
    "leaveMessage" TEXT,
    "autoRolesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "muteRoleId" TEXT,
    "autoModEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoModDM" BOOLEAN NOT NULL DEFAULT true,
    "autoModBypassMods" BOOLEAN NOT NULL DEFAULT true,
    "autoModBlockInvites" BOOLEAN NOT NULL DEFAULT false,
    "autoModMassMentionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoModMassMentionLimit" INTEGER NOT NULL DEFAULT 5,
    "autoModSpamEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoModSpamMessages" INTEGER NOT NULL DEFAULT 5,
    "autoModSpamSeconds" INTEGER NOT NULL DEFAULT 5,
    "autoModSpamTimeoutMinutes" INTEGER NOT NULL DEFAULT 5,
    "autoModExcludedChannelsEnabled" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Config" ("achievementChannelId", "achievementNotifyChannel", "achievementNotifyDM", "autoModBlockInvites", "autoModBypassMods", "autoModDM", "autoModEnabled", "autoModExcludedChannelsEnabled", "autoModMassMentionEnabled", "autoModMassMentionLimit", "autoModSpamEnabled", "autoModSpamMessages", "autoModSpamSeconds", "autoModSpamTimeoutMinutes", "botStatusText", "guildIconUrl", "guildMemberCount", "guildName", "id", "leaveChannelId", "leaveMessage", "levelUpChannelId", "levelingEnabled", "logChannelId", "logMemberBan", "logMemberJoin", "logMemberLeave", "logMemberNickname", "logMemberRoles", "logMemberUnban", "logMessageDelete", "logMessageEdit", "logVoice", "muteRoleId", "ticketCategoryId", "ticketStaffRoleId", "updatedAt", "welcomeChannelId", "welcomeMessage", "xpCooldownSeconds", "xpPerMessageMax", "xpPerMessageMin", "xpPerMinuteVoice") SELECT "achievementChannelId", "achievementNotifyChannel", "achievementNotifyDM", "autoModBlockInvites", "autoModBypassMods", "autoModDM", "autoModEnabled", "autoModExcludedChannelsEnabled", "autoModMassMentionEnabled", "autoModMassMentionLimit", "autoModSpamEnabled", "autoModSpamMessages", "autoModSpamSeconds", "autoModSpamTimeoutMinutes", "botStatusText", "guildIconUrl", "guildMemberCount", "guildName", "id", "leaveChannelId", "leaveMessage", "levelUpChannelId", "levelingEnabled", "logChannelId", "logMemberBan", "logMemberJoin", "logMemberLeave", "logMemberNickname", "logMemberRoles", "logMemberUnban", "logMessageDelete", "logMessageEdit", "logVoice", "muteRoleId", "ticketCategoryId", "ticketStaffRoleId", "updatedAt", "welcomeChannelId", "welcomeMessage", "xpCooldownSeconds", "xpPerMessageMax", "xpPerMessageMin", "xpPerMinuteVoice" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
