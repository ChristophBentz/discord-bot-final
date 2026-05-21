-- CreateTable
CREATE TABLE "WhitelistedInvite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "note" TEXT,
    "addedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "WhitelistedInvite_code_key" ON "WhitelistedInvite"("code");
