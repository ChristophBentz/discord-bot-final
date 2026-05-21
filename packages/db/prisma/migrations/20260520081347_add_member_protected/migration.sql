-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Member" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "discriminator" TEXT,
    "avatarUrl" TEXT,
    "joinedAt" DATETIME,
    "roleIds" TEXT NOT NULL DEFAULT '',
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "inServer" BOOLEAN NOT NULL DEFAULT true,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Member" ("avatarUrl", "discriminator", "displayName", "inServer", "isBot", "joinedAt", "lastSyncAt", "roleIds", "userId", "username") SELECT "avatarUrl", "discriminator", "displayName", "inServer", "isBot", "joinedAt", "lastSyncAt", "roleIds", "userId", "username" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE INDEX "Member_displayName_idx" ON "Member"("displayName");
CREATE INDEX "Member_inServer_idx" ON "Member"("inServer");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
