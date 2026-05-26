ALTER TABLE "CustomCommand" ADD COLUMN "description" TEXT NOT NULL DEFAULT 'Custom-Command';
ALTER TABLE "CustomCommand" ADD COLUMN "responseType" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "CustomCommand" ADD COLUMN "embedTitle" TEXT;
ALTER TABLE "CustomCommand" ADD COLUMN "embedDescription" TEXT;
ALTER TABLE "CustomCommand" ADD COLUMN "embedColor" INTEGER;
ALTER TABLE "CustomCommand" ADD COLUMN "embedImageUrl" TEXT;
ALTER TABLE "CustomCommand" ADD COLUMN "embedFooter" TEXT;
ALTER TABLE "CustomCommand" ADD COLUMN "ephemeral" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CustomCommand" ADD COLUMN "allowedRoleIds" TEXT NOT NULL DEFAULT '';

-- response default value setzen (war ohne Default)
-- SQLite kann das nicht per ALTER, aber bestehende rows haben schon einen Wert.
