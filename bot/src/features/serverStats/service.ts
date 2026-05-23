import type { Client, Guild, VoiceChannel } from "discord.js";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import { getConfig, prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { env } from "../../lib/env.js";

export type StatType = "totalMembers" | "humanMembers" | "onlineMembers";

export const STAT_LABELS: Record<StatType, string> = {
  totalMembers: "Mitglieder gesamt",
  humanMembers: "Mitglieder (ohne Bots)",
  onlineMembers: "Gerade online",
};

export const DEFAULT_TEMPLATES: Record<StatType, string> = {
  totalMembers: "👥 Mitglieder: {count}",
  humanMembers: "👤 Mitglieder: {count}",
  onlineMembers: "🟢 Online: {count}",
};

function isStatType(s: string): s is StatType {
  return s === "totalMembers" || s === "humanMembers" || s === "onlineMembers";
}

export function renderName(template: string, count: number): string {
  return template.replaceAll("{count}", count.toLocaleString("de-DE")).slice(0, 100);
}

async function getGuild(client: Client): Promise<Guild | null> {
  return client.guilds.cache.get(env.DISCORD_GUILD_ID) ?? null;
}

// ─── Wert-Berechnung ────────────────────────────────────────────────────────
// Trick: für "Online" nutzen wir `guild.presences.cache` direkt — discord.js
// pflegt diesen Cache automatisch sobald die GuildPresences-Intent aktiv ist
// und Events ankommen. Kein manuelles Member-Fetching nötig.

function countOnline(guild: Guild): number {
  let count = 0;
  for (const presence of guild.presences.cache.values()) {
    if (presence.status === "offline") continue;
    const member = presence.member ?? guild.members.cache.get(presence.userId);
    if (!member || member.user.bot) continue;
    count += 1;
  }
  return count;
}

function countHumans(guild: Guild): number {
  // Wenn Cache lückenhaft ist (kein Member-Fetch), fallback auf memberCount
  if (guild.members.cache.size < guild.memberCount * 0.9) {
    return guild.memberCount;
  }
  return guild.members.cache.filter((m) => !m.user.bot).size;
}

export function computeValue(guild: Guild, type: StatType): number {
  switch (type) {
    case "totalMembers":
      return guild.memberCount;
    case "humanMembers":
      return countHumans(guild);
    case "onlineMembers":
      return countOnline(guild);
  }
}

// ─── Channel-Verwaltung ─────────────────────────────────────────────────────

// Erstellt fehlende Stat-Channels, löscht Channels deaktivierter Stats.
export async function ensureStatChannels(client: Client): Promise<void> {
  const config = await getConfig();
  if (!config.serverStatsEnabled) return;

  const guild = await getGuild(client);
  if (!guild) {
    logger.warn("ServerStats: Guild nicht im Cache");
    return;
  }

  const stats = await prisma.serverStat.findMany({ orderBy: { position: "asc" } });

  for (const stat of stats) {
    if (!isStatType(stat.type)) continue;

    // Deaktiviert + hat noch Channel → Channel löschen, Verbindung trennen
    if (!stat.enabled) {
      if (stat.channelId) {
        const ch = await guild.channels.fetch(stat.channelId).catch(() => null);
        if (ch) await ch.delete("Server-Stat deaktiviert").catch(() => {});
        await prisma.serverStat.update({ where: { id: stat.id }, data: { channelId: null } });
      }
      continue;
    }

    // Aktiv aber Channel-Referenz da → checken, ob Channel noch existiert
    if (stat.channelId) {
      const exists = await guild.channels.fetch(stat.channelId).catch(() => null);
      if (exists && exists.type === ChannelType.GuildVoice) continue;
      // Channel wurde gelöscht/verlegt → Referenz bereinigen, neu anlegen
      await prisma.serverStat.update({ where: { id: stat.id }, data: { channelId: null } });
    }

    // Neuen Channel anlegen — fall back auf "ohne Kategorie" wenn die nicht existiert
    let parentId: string | undefined = config.serverStatsCategoryId ?? undefined;
    if (parentId) {
      const cat = await guild.channels.fetch(parentId).catch(() => null);
      if (!cat || cat.type !== ChannelType.GuildCategory) {
        logger.warn(
          { configuredCategory: parentId },
          "ServerStats: konfigurierte Kategorie nicht gefunden — Channel ohne Kategorie",
        );
        parentId = undefined;
      }
    }

    try {
      const value = computeValue(guild, stat.type);
      const channel = (await guild.channels.create({
        name: renderName(stat.nameTemplate, value),
        type: ChannelType.GuildVoice,
        parent: parentId,
        position: stat.position,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages],
          },
        ],
        reason: "Server-Stats Channel",
      })) as VoiceChannel;

      await prisma.serverStat.update({
        where: { id: stat.id },
        data: {
          channelId: channel.id,
          lastValue: value,
          lastCheck: new Date(),
          lastUpdate: new Date(),
        },
      });
      logger.info(
        { statId: stat.id, channelId: channel.id, value, parentId },
        "ServerStats: Channel erstellt",
      );
    } catch (err) {
      logger.error(
        { err, statId: stat.id, type: stat.type, parentId },
        "ServerStats: Channel-Erstellung fehlgeschlagen — Bot-Permissions checken (Manage Channels)",
      );
    }
  }
}

// ─── Update-Loop ────────────────────────────────────────────────────────────

export interface UpdateResult {
  renamed: number;
  unchanged: number;
  failed: number;
  rateLimited: number;
}

// Discord limitiert Channel-Renames auf 2 pro 10 Min pro Channel. Wir
// halten uns selbst an min. 5,5 Min Abstand zwischen Renames pro Stat,
// damit wir nie in die Rate-Limit-Penalty rutschen (die discord.js
// dann durch Awaiten "auflöst" und das ganze Update-System verzögert).
const MIN_RENAME_INTERVAL_MS = 5.5 * 60_000;

// Jeder aktive Stat: Wert berechnen → mit aktuellem Channel-Namen vergleichen
// → wenn unterschiedlich, umbenennen. Keine DB-Cache-Tricks — der echte
// Channel-Name ist die Source of Truth.
export async function updateAllStats(client: Client): Promise<UpdateResult> {
  const config = await getConfig();
  if (!config.serverStatsEnabled) return { renamed: 0, unchanged: 0, failed: 0, rateLimited: 0 };

  const guild = await getGuild(client);
  if (!guild) return { renamed: 0, unchanged: 0, failed: 0, rateLimited: 0 };

  const stats = await prisma.serverStat.findMany({
    where: { enabled: true, channelId: { not: null } },
  });

  let renamed = 0;
  let unchanged = 0;
  let failed = 0;
  let rateLimited = 0;
  const now = new Date();

  for (const stat of stats) {
    if (!isStatType(stat.type) || !stat.channelId) continue;

    const value = computeValue(guild, stat.type);
    const expected = renderName(stat.nameTemplate, value);
    const channel = await guild.channels.fetch(stat.channelId).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await prisma.serverStat.update({ where: { id: stat.id }, data: { channelId: null } });
      failed += 1;
      continue;
    }

    const current = (channel as VoiceChannel).name;
    logger.debug(
      { statId: stat.id, type: stat.type, value, current, expected },
      "ServerStats: Wert berechnet",
    );

    // Name passt schon → nur lastCheck/lastValue updaten
    if (current === expected) {
      await prisma.serverStat.update({
        where: { id: stat.id },
        data: { lastValue: value, lastCheck: now },
      });
      unchanged += 1;
      continue;
    }

    // Rate-Limit-Schutz: nicht öfter als alle 5,5 Min renamen
    const sinceLast = stat.lastUpdate ? now.getTime() - stat.lastUpdate.getTime() : Infinity;
    if (sinceLast < MIN_RENAME_INTERVAL_MS) {
      const waitSec = Math.ceil((MIN_RENAME_INTERVAL_MS - sinceLast) / 1000);
      await prisma.serverStat.update({
        where: { id: stat.id },
        data: { lastValue: value, lastCheck: now },
      });
      logger.info(
        { statId: stat.id, waitSec, current, expected },
        "ServerStats: Rename übersprungen (eigener Rate-Limit-Schutz)",
      );
      rateLimited += 1;
      continue;
    }

    // Umbenennen — mit Timeout damit wir nicht ewig blockieren falls
    // discord.js trotzdem in die Discord-Rate-Limit-Wartezeit gerät
    try {
      await Promise.race([
        (channel as VoiceChannel).setName(expected, "Server-Stats-Update"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("setName-Timeout (10s)")), 10_000),
        ),
      ]);
      await prisma.serverStat.update({
        where: { id: stat.id },
        data: { lastValue: value, lastCheck: now, lastUpdate: now },
      });
      logger.info(
        { statId: stat.id, oldName: current, newName: expected },
        "ServerStats: Channel umbenannt",
      );
      renamed += 1;
    } catch (err) {
      await prisma.serverStat.update({
        where: { id: stat.id },
        data: { lastCheck: now },
      });
      logger.warn({ err, statId: stat.id }, "ServerStats: setName fehlgeschlagen");
      failed += 1;
    }
  }

  logger.info(
    { renamed, unchanged, failed, rateLimited, total: stats.length },
    "ServerStats: Tick fertig",
  );
  return { renamed, unchanged, failed, rateLimited };
}

// ─── Diagnose ───────────────────────────────────────────────────────────────

export interface DiagnoseRow {
  id: number;
  type: string;
  enabled: boolean;
  channelId: string | null;
  computedValue: number | null;
  expectedName: string | null;
  actualName: string | null;
  matches: boolean | null;
  channelExists: boolean;
  status: "ok" | "no_channel_id" | "channel_missing" | "wrong_type";
}

export interface Diagnose {
  guildId: string | null;
  memberCount: number;
  membersCached: number;
  presencesCached: number;
  presencesNonOffline: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryExists: boolean;
  rows: DiagnoseRow[];
  lastTickAt: string | null;
}

let lastTickAt: Date | null = null;

export async function diagnose(client: Client): Promise<Diagnose> {
  const guild = await getGuild(client);
  const config = await getConfig();
  if (!guild) {
    return {
      guildId: null,
      memberCount: 0,
      membersCached: 0,
      presencesCached: 0,
      presencesNonOffline: 0,
      categoryId: config.serverStatsCategoryId,
      categoryName: null,
      categoryExists: false,
      rows: [],
      lastTickAt: lastTickAt?.toISOString() ?? null,
    };
  }

  const presencesNonOffline = guild.presences.cache.filter((p) => p.status !== "offline").size;
  const stats = await prisma.serverStat.findMany({ orderBy: { position: "asc" } });
  const rows: DiagnoseRow[] = [];

  // Kategorie-Status
  let categoryName: string | null = null;
  let categoryExists = false;
  if (config.serverStatsCategoryId) {
    const cat = await guild.channels.fetch(config.serverStatsCategoryId).catch(() => null);
    if (cat && cat.type === ChannelType.GuildCategory) {
      categoryExists = true;
      categoryName = cat.name;
    }
  }

  for (const stat of stats) {
    if (!isStatType(stat.type)) continue;
    const computedValue = computeValue(guild, stat.type);
    const expectedName = renderName(stat.nameTemplate, computedValue);

    let actualName: string | null = null;
    let channelExists = false;
    let status: DiagnoseRow["status"] = "ok";

    if (!stat.channelId) {
      status = "no_channel_id";
    } else {
      // Erst Cache, dann REST (Cache wird via gateway events aktualisiert)
      const ch =
        guild.channels.cache.get(stat.channelId) ??
        (await guild.channels.fetch(stat.channelId).catch(() => null));
      if (!ch) {
        status = "channel_missing";
      } else if (ch.type !== ChannelType.GuildVoice) {
        status = "wrong_type";
      } else {
        channelExists = true;
        actualName = (ch as VoiceChannel).name;
      }
    }

    rows.push({
      id: stat.id,
      type: stat.type,
      enabled: stat.enabled,
      channelId: stat.channelId,
      computedValue,
      expectedName,
      actualName,
      matches: actualName !== null ? actualName === expectedName : null,
      channelExists,
      status,
    });
  }

  return {
    guildId: guild.id,
    memberCount: guild.memberCount,
    membersCached: guild.members.cache.size,
    presencesCached: guild.presences.cache.size,
    presencesNonOffline,
    categoryId: config.serverStatsCategoryId,
    categoryName,
    categoryExists,
    rows,
    lastTickAt: lastTickAt?.toISOString() ?? null,
  };
}

// Setzt alle channelId-Referenzen auf null → ensureStatChannels legt sie
// beim nächsten Tick neu an. Nutzt der User wenn Channels manuell gelöscht
// wurden oder die DB-Referenzen verwaist sind.
export async function resetChannelReferences(client: Client): Promise<{ recreated: number }> {
  await prisma.serverStat.updateMany({
    where: { enabled: true },
    data: { channelId: null },
  });
  await ensureStatChannels(client);
  const updated = await prisma.serverStat.count({
    where: { enabled: true, channelId: { not: null } },
  });
  return { recreated: updated };
}

// ─── Scheduler ──────────────────────────────────────────────────────────────

let timerId: ReturnType<typeof setTimeout> | null = null;

async function tick(client: Client): Promise<void> {
  lastTickAt = new Date();
  try {
    await ensureStatChannels(client);
    await updateAllStats(client);
  } catch (err) {
    logger.error({ err }, "ServerStats: Tick fehlgeschlagen");
  }

  const config = await getConfig().catch(() => null);
  const minutes = Math.max(1, Math.min(120, config?.serverStatsUpdateMinutes ?? 10));
  timerId = setTimeout(() => void tick(client), minutes * 60_000);
}

export function startServerStatsScheduler(client: Client): void {
  if (timerId) return;
  logger.info("ServerStats: Scheduler gestartet");
  // Erster Lauf nach 10s — Bot hat dann genug Zeit Member-Cache aufzubauen
  timerId = setTimeout(() => void tick(client), 10_000);
}
