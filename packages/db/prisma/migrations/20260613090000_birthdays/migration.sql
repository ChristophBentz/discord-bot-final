-- AlterTable Member
ALTER TABLE "Member" ADD COLUMN "birthdayDay" INTEGER;
ALTER TABLE "Member" ADD COLUMN "birthdayMonth" INTEGER;
ALTER TABLE "Member" ADD COLUMN "birthdayYear" INTEGER;
ALTER TABLE "Member" ADD COLUMN "birthdayShow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Member" ADD COLUMN "birthdayShowAge" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Member" ADD COLUMN "birthdayAnnounce" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable Config
ALTER TABLE "Config" ADD COLUMN "birthdayEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Config" ADD COLUMN "birthdayChannelId" TEXT;
ALTER TABLE "Config" ADD COLUMN "birthdayMessage" TEXT;
ALTER TABLE "Config" ADD COLUMN "birthdayPingRoleId" TEXT;
ALTER TABLE "Config" ADD COLUMN "birthdayLastRun" TEXT;

-- Index für die tägliche Geburtstags-Abfrage
CREATE INDEX "Member_birthdayMonth_birthdayDay_idx" ON "Member"("birthdayMonth", "birthdayDay");
