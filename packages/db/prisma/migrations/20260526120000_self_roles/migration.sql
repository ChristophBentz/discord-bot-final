-- CreateTable
CREATE TABLE "SelfRolePanel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" INTEGER,
    "uniqueChoice" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SelfRoleOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "panelId" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "buttonStyle" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SelfRoleOption_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "SelfRolePanel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SelfRolePanel_channelId_idx" ON "SelfRolePanel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "SelfRoleOption_panelId_roleId_key" ON "SelfRoleOption"("panelId", "roleId");
