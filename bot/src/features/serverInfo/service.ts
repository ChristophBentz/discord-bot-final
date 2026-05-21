import type { Client, Guild } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { env } from "../../lib/env.js";

async function syncGuild(guild: Guild): Promise<void> {
  try {
    await prisma.config.upsert({
      where: { id: 1 },
      update: {
        guildName: guild.name,
        guildIconUrl: guild.iconURL({ size: 128 }),
        guildMemberCount: guild.memberCount,
      },
      create: {
        id: 1,
        guildName: guild.name,
        guildIconUrl: guild.iconURL({ size: 128 }),
        guildMemberCount: guild.memberCount,
      },
    });
  } catch (err) {
    logger.error({ err }, "Server-Info-Sync fehlgeschlagen");
  }
}

// Beim Start: konfigurierte Guild laden und ihre Daten in die DB schreiben.
export async function syncServerInfoOnce(client: Client): Promise<void> {
  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) {
    logger.warn({ guildId: env.DISCORD_GUILD_ID }, "Guild nicht im Cache");
    return;
  }
  await syncGuild(guild);
  logger.info({ name: guild.name, members: guild.memberCount }, "Server-Info synchronisiert");
}

// Polling-Variante: alle 5 Minuten erneut, um Member-Count aktuell zu halten.
export function startServerInfoSync(client: Client): void {
  void syncServerInfoOnce(client);
  setInterval(() => void syncServerInfoOnce(client), 5 * 60_000);
}
