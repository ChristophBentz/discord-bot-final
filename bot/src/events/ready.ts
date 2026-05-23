import { Events } from "discord.js";
import type { BotEvent } from "../lib/types.js";
import { logger } from "../lib/logger.js";
import { startPresenceSync } from "../features/presence/service.js";
import { bootstrapSessions } from "../features/leveling/voiceSessions.js";
import { startServerInfoSync } from "../features/serverInfo/service.js";
import { bulkSync as syncMembers } from "../features/members/service.js";
import { bulkSyncChannels } from "../features/channels/service.js";
import {
  cleanupOrphanedTempChannels,
  startTempChannelSweeper,
} from "../features/tempChannels/service.js";
import {
  ensurePanel as ensureTicketPanel,
  startTicketCleanup,
} from "../features/tickets/service.js";
import { initMusicPlayer } from "../features/music/player.js";
import { startFreeGamesScheduler } from "../features/freeGames/service.js";
import { startRssScheduler } from "../features/rss/service.js";
import { startServerStatsScheduler } from "../features/serverStats/service.js";
import { startApiServer } from "../api/server.js";

const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info({ user: client.user.tag, guilds: client.guilds.cache.size }, "Bot online");
    startPresenceSync(client);
    bootstrapSessions(client);
    startServerInfoSync(client);
    await initMusicPlayer(client);
    startFreeGamesScheduler(client);
    startRssScheduler(client);
    startApiServer(client);
    await syncMembers(client);
    // Stats-Scheduler braucht den Members-Cache (humanMembers/online), deshalb erst hier.
    startServerStatsScheduler(client);
    await bulkSyncChannels(client);
    await cleanupOrphanedTempChannels(client);
    startTempChannelSweeper(client);
    await ensureTicketPanel(client);
    startTicketCleanup(client);
  },
};

export default event;
