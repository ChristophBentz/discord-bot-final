-- Config-Erweiterung für AI-Features
ALTER TABLE "Config" ADD COLUMN "aiEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Config" ADD COLUMN "aiProvider" TEXT NOT NULL DEFAULT 'minimax';
ALTER TABLE "Config" ADD COLUMN "aiApiKey" TEXT;
ALTER TABLE "Config" ADD COLUMN "aiGroupId" TEXT;
ALTER TABLE "Config" ADD COLUMN "aiImageChannelId" TEXT;
ALTER TABLE "Config" ADD COLUMN "aiImagesPerUserPerDay" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Config" ADD COLUMN "aiImageModel" TEXT NOT NULL DEFAULT 'image-01';

-- AiUsage-Tabelle für Rate-Limit + Stats
CREATE TABLE "AiUsage" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId" TEXT NOT NULL,
  "command" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "imageUrl" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorMsg" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");
