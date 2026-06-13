-- AlterTable Giveaway
ALTER TABLE "Giveaway" ADD COLUMN "bonusRolesJson" TEXT;

-- AlterTable GiveawayEntry
ALTER TABLE "GiveawayEntry" ADD COLUMN "tickets" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "GiveawayEntry" ADD COLUMN "assignedCode" TEXT;
ALTER TABLE "GiveawayEntry" ADD COLUMN "dmStatus" TEXT;
