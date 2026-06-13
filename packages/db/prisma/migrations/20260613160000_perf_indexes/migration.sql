-- Performance-Indizes für heiße Sortier-/Filter-Pfade.

-- LevelUser: Leaderboard-Sortierung + Rang-Zählung (count where xp > x) + "zuletzt aktiv".
CREATE INDEX "LevelUser_xp_idx" ON "LevelUser"("xp");
CREATE INDEX "LevelUser_lastMessage_idx" ON "LevelUser"("lastMessage");

-- ChannelActivity: Top-Channels-Analytics filtert nur über date.
CREATE INDEX "ChannelActivity_date_idx" ON "ChannelActivity"("date");

-- Warning: globale "neueste Warnungen"-Listen sortieren über createdAt.
CREATE INDEX "Warning_createdAt_idx" ON "Warning"("createdAt");
