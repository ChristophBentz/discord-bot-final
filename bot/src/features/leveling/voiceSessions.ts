import type { Client } from "discord.js";
import { prisma } from "@repo/db";
import { addXp } from "./service.js";
import { announceLevelUp } from "./levelUpNotifier.js";
import { incrementDailyActivity } from "./dailyActivity.js";
import { checkAndAwardAuto } from "./achievements.js";
import { logger } from "../../lib/logger.js";

// userId -> Beginn der aktuellen Voice-Session (epoch ms)
const sessions = new Map<string, number>();

export function startSession(userId: string): void {
  if (!sessions.has(userId)) sessions.set(userId, Date.now());
}

// Beendet die Session und gibt XP basierend auf der Dauer.
export async function endSession(
  client: Client,
  userId: string,
  displayName: string | null,
): Promise<void> {
  const started = sessions.get(userId);
  if (!started) return;
  sessions.delete(userId);

  const seconds = Math.floor((Date.now() - started) / 1000);
  if (seconds <= 0) return;
  const minutes = Math.floor(seconds / 60);

  try {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (!config?.levelingEnabled) return;
    const rate = config.xpPerMinuteVoice;
    const xp = rate > 0 ? minutes * rate : 0;

    const result = await addXp(userId, xp, {
      displayName,
      voiceSecondsIncrement: seconds,
    });
    await incrementDailyActivity(userId, { voiceSeconds: seconds });
    logger.debug({ userId, seconds, xp }, "Voice-XP vergeben");

    if (result.leveledUp) {
      await announceLevelUp({ client, userId, newLevel: result.newLevel });
    }

    await checkAndAwardAuto(client, result.user);
  } catch (err) {
    logger.error({ err, userId, seconds }, "Voice-XP konnte nicht vergeben werden");
  }
}

// Beim Bot-Start: alle bereits in Voice befindlichen User in Sessions aufnehmen.
export function bootstrapSessions(client: Client): void {
  let count = 0;
  for (const guild of client.guilds.cache.values()) {
    for (const state of guild.voiceStates.cache.values()) {
      if (state.channelId && state.member && !state.member.user.bot) {
        startSession(state.id);
        count += 1;
      }
    }
  }
  if (count > 0) logger.info({ count }, "Voice-Sessions beim Start aufgenommen");
}
