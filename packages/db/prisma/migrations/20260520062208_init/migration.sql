-- CreateTable
CREATE TABLE "Config" (
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
    "levelingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "levelUpChannelId" TEXT,
    "xpPerMessageMin" INTEGER NOT NULL DEFAULT 15,
    "xpPerMessageMax" INTEGER NOT NULL DEFAULT 25,
    "xpCooldownSeconds" INTEGER NOT NULL DEFAULT 60,
    "xpPerMinuteVoice" INTEGER NOT NULL DEFAULT 5,
    "ticketCategoryId" TEXT,
    "ticketStaffRoleId" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AutoRole" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roleId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Mute" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LevelUser" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "voiceSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastMessage" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LevelReward" (
    "level" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roleId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "closedBy" TEXT
);

-- CreateTable
CREATE TABLE "CustomCommand" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "response" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Member" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "discriminator" TEXT,
    "avatarUrl" TEXT,
    "joinedAt" DATETIME,
    "roleIds" TEXT NOT NULL DEFAULT '',
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "inServer" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GuildRole" (
    "roleId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "GuildChannel" (
    "channelId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ChannelActivity" (
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "channelId", "date")
);

-- CreateTable
CREATE TABLE "HourlyActivity" (
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "voiceSeconds" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "date", "hour")
);

-- CreateTable
CREATE TABLE "MemberNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoRole_roleId_key" ON "AutoRole"("roleId");

-- CreateIndex
CREATE INDEX "Warning_userId_idx" ON "Warning"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Mute_userId_key" ON "Mute"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Member_displayName_idx" ON "Member"("displayName");

-- CreateIndex
CREATE INDEX "Member_inServer_idx" ON "Member"("inServer");

-- CreateIndex
CREATE INDEX "GuildRole_position_idx" ON "GuildRole"("position");

-- CreateIndex
CREATE INDEX "GuildChannel_position_idx" ON "GuildChannel"("position");

-- CreateIndex
CREATE INDEX "ChannelActivity_userId_date_idx" ON "ChannelActivity"("userId", "date");

-- CreateIndex
CREATE INDEX "ChannelActivity_channelId_idx" ON "ChannelActivity"("channelId");

-- CreateIndex
CREATE INDEX "HourlyActivity_userId_idx" ON "HourlyActivity"("userId");

-- CreateIndex
CREATE INDEX "HourlyActivity_date_idx" ON "HourlyActivity"("date");

-- CreateIndex
CREATE INDEX "MemberNote_userId_idx" ON "MemberNote"("userId");
