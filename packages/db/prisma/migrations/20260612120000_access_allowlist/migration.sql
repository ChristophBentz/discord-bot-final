-- AlterTable
ALTER TABLE "Config" ADD COLUMN "accessAllowlistEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AllowlistedUser" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
