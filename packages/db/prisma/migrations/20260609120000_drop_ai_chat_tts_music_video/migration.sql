-- Chat/TTS/Music/Video-Features wurden wieder entfernt. SQLite 3.35+
-- unterstützt ALTER TABLE DROP COLUMN (Server-Stack hat Node 22 mit
-- modernem SQLite).

ALTER TABLE "Config" DROP COLUMN "aiChatEnabled";
ALTER TABLE "Config" DROP COLUMN "aiChatChannelId";
ALTER TABLE "Config" DROP COLUMN "aiChatPerUserPerDay";
ALTER TABLE "Config" DROP COLUMN "aiChatModel";

ALTER TABLE "Config" DROP COLUMN "aiTtsEnabled";
ALTER TABLE "Config" DROP COLUMN "aiTtsChannelId";
ALTER TABLE "Config" DROP COLUMN "aiTtsPerUserPerDay";
ALTER TABLE "Config" DROP COLUMN "aiTtsModel";
ALTER TABLE "Config" DROP COLUMN "aiTtsVoiceId";

ALTER TABLE "Config" DROP COLUMN "aiMusicEnabled";
ALTER TABLE "Config" DROP COLUMN "aiMusicChannelId";
ALTER TABLE "Config" DROP COLUMN "aiMusicPerUserPerDay";
ALTER TABLE "Config" DROP COLUMN "aiMusicModel";

ALTER TABLE "Config" DROP COLUMN "aiVideoEnabled";
ALTER TABLE "Config" DROP COLUMN "aiVideoChannelId";
ALTER TABLE "Config" DROP COLUMN "aiVideoPerUserPerDay";
ALTER TABLE "Config" DROP COLUMN "aiVideoModel";
