-- AlterTable Config
ALTER TABLE "Config" ADD COLUMN "autoModImageEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Config" ADD COLUMN "autoModImageAction" TEXT NOT NULL DEFAULT 'timeout';
ALTER TABLE "Config" ADD COLUMN "autoModImageTimeoutMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Config" ADD COLUMN "autoModImageThreshold" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "BlockedImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "thumbnail" TEXT,
    "addedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "BlockedImage_hash_idx" ON "BlockedImage"("hash");
