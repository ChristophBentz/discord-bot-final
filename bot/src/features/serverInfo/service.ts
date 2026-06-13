import type { Client, Guild } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { env } from "../../lib/env.js";

async function syncGuild(client: Client, guild: Guild): Promise<void> {
  try {
    // Bot-Info aus dem Client — für Vorschauen im Dashboard.
    const me = guild.members.me ?? null;
    const botName = me?.displayName ?? client.user?.username ?? "Bot";
    const botAvatarUrl =
      me?.displayAvatarURL({ size: 128 }) ??
      client.user?.displayAvatarURL({ size: 128 }) ??
      null;

    // Banner ist nur am User-Objekt verfügbar (nicht am GuildMember) UND wird von
    // Discord nicht im READY-Payload geliefert → client.user.banner ist dann
    // `undefined`. Ohne expliziten Fetch würde bannerURL() `null` liefern und der
    // Sync das im Dashboard gesetzte Banner überschreiben.
    let botBannerUrl: string | null | undefined;
    if (client.user) {
      if (client.user.banner === undefined) {
        // Noch nicht geladen → einmal nachladen. Schlägt das fehl, bleibt der
        // Wert unbekannt und wird unten NICHT geschrieben.
        try {
          await client.user.fetch();
        } catch (err) {
          logger.warn({ err }, "Bot-User-Fetch für Banner fehlgeschlagen");
        }
      }
      // Nur einen verlässlichen Wert (string oder explizit null) übernehmen.
      botBannerUrl = client.user.banner === undefined ? undefined : client.user.bannerURL({ size: 1024 }) ?? null;
    }

    const data: {
      guildName: string;
      guildIconUrl: string | null;
      guildMemberCount: number;
      botName: string;
      botAvatarUrl: string | null;
      botBannerUrl?: string | null;
    } = {
      guildName: guild.name,
      guildIconUrl: guild.iconURL({ size: 128 }),
      guildMemberCount: guild.memberCount,
      botName,
      botAvatarUrl,
    };
    // Banner nur schreiben, wenn verlässlich bekannt — sonst gesetztes Banner behalten.
    if (botBannerUrl !== undefined) {
      data.botBannerUrl = botBannerUrl;
    }

    await prisma.config.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
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
  await syncGuild(client, guild);
  logger.info({ name: guild.name, members: guild.memberCount }, "Server-Info synchronisiert");
}

// Polling-Variante: alle 5 Minuten erneut, um Member-Count aktuell zu halten.
export function startServerInfoSync(client: Client): void {
  void syncServerInfoOnce(client);
  setInterval(() => void syncServerInfoOnce(client), 5 * 60_000);
}
