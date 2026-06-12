-- CreateTable
CREATE TABLE "ModEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ModEvent_userId_idx" ON "ModEvent"("userId");

-- CreateIndex
CREATE INDEX "ModEvent_createdAt_idx" ON "ModEvent"("createdAt");
