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

let lastPresenceFetch = 0;
const PRESENCE_REFETCH_INTERVAL_MS = 30 * 60_000;

// Lädt Members in den Cache (falls leer) und versucht periodisch Presences
// nachzuziehen. Discord schickt Presences zuverlässig nur initial via
// GUILD_CREATE (large_threshold) und über Live-Events; ein expliziter
// Bulk-Fetch mit withPresences:true wird vom Gateway oft ohne Presences
// beantwortet — deshalb hier zusätzlich periodisch.
async function ensureMemberCache(guild: Guild, needPresences: boolean): Promise<void> {
  const cacheTooSmall = guild.members.cache.size < guild.memberCount * 0.9;
  const presenceStale =
    needPresences && Date.now() - lastPresenceFetch > PRESENCE_REFETCH_INTERVAL_MS;

  if (!cacheTooSmall && !presenceStale) return;

  try {
    await guild.members.fetch({ withPresences: needPresences });
    if (needPresences) lastPresenceFetch = Date.now();
    const withPresenceCount = guild.members.cache.filter((m) => m.presence !== null).size;
    logger.info(
      {
        cached: guild.members.cache.size,
        total: guild.memberCount,
        withPresence: withPresenceCount,
        requestedPresences: needPresences,
      },
      "ServerStats: Member-Cache geladen",
    );
  } catch (err) {
    logger.warn(
      { err, needPresences },
      "ServerStats: Member-Cache laden fehlgeschlagen — Presence-Intent im Dev-Portal aktiviert?",
    );
  }
}

export async function computeStatValue(guild: Guild, type: StatType): Promise<number> {
  switch (type) {
    case "totalMembers":
      return guild.memberCount;
    case "humanMembers": {
      await ensureMemberCache(guild, false);
      return guild.members.cache.filter((m) => !m.user.bot).size;
    }
    case "onlineMembers": {
      // Braucht GuildPresences-Intent — sonst sind presence-Daten leer
      await ensureMemberCache(guild, true);
      return guild.members.cache.filter(
        (m) => !m.user.bot && m.presence && m.presence.status !== "offline",
      ).size;
    }
  }
}

export function renderName(template: string, count: number): string {
  // Max-Länge Voice-Channel-Name: 100
  const formatted = count.toLocaleString("de-DE");
  return template.replaceAll("{count}", formatted).slice(0, 100);
}

async function getGuild(client: Client): Promise<Guild | null> {
  return client.guilds.cache.get(env.DISCORD_GUILD_ID) ?? null;
}

// Stellt sicher, dass jeder enabled Stat einen Channel hat. Erstellt neue,
// löscht orphaned (in DB, aber enabled=false oder gelöscht).
export async function ensureStatChannels(client: Client): Promise<void> {
  const config = await getConfig();
  if (!config.serverStatsEnabled) return;

  const guild = await getGuild(client);
  if (!guild) {
    logger.warn("ServerStats: Guild nicht im Cache");
    return;
  }

  const stats = await prisma.serverStat.findMany({ orderBy: { position: "asc" } });
  const everyone = guild.roles.everyone;

  for (const stat of stats) {
    if (!isStatType(stat.type)) continue;

    // Disabled → wenn Channel existiert, löschen
    if (!stat.enabled) {
      if (stat.channelId) {
        const ch = await guild.channels.fetch(stat.channelId).catch(() => null);
        if (ch) await ch.delete("Server-Stat deaktiviert").catch(() => {});
        await prisma.serverStat.update({ where: { id: stat.id }, data: { channelId: null } });
      }
      continue;
    }

    // Hat schon einen Channel — checken, ob er noch existiert + Name aktuell halten
    if (stat.channelId) {
      const existing = await guild.channels.fetch(stat.channelId).catch(() => null);
      if (existing && existing.type === ChannelType.GuildVoice) {
        // Wenn der aktuelle Name nicht zum Template+Wert passt → korrigieren
        const value = await computeStatValue(guild, stat.type);
        const expected = renderName(stat.nameTemplate, value);
        if ((existing as VoiceChannel).name !== expected) {
          try {
            await (existing as VoiceChannel).setName(expected, "ServerStats: Name-Sync");
            await prisma.serverStat.update({
              where: { id: stat.id },
              data: { lastValue: value, lastUpdate: new Date() },
            });
            logger.info({ statId: stat.id, newName: expected }, "ServerStats: Name korrigiert");
          } catch (err) {
            logger.warn({ err, statId: stat.id }, "ServerStats: Name-Sync fehlgeschlagen");
          }
        }
        continue;
      }
      // Existiert nicht mehr — Eintrag bereinigen, dann neu erstellen
      await prisma.serverStat.update({ where: { id: stat.id }, data: { channelId: null } });
    }

    // Channel anlegen
    try {
      const initialValue = await computeStatValue(guild, stat.type);
      const name = renderName(stat.nameTemplate, initialValue);
      const channel = (await guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: config.serverStatsCategoryId ?? undefined,
        position: stat.position,
        permissionOverwrites: [
          {
            id: everyone.id,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages],
          },
        ],
        reason: "Server-Stats: automatischer Counter-Channel",
      })) as VoiceChannel;

      await prisma.serverStat.update({
        where: { id: stat.id },
        data: { channelId: channel.id, lastValue: initialValue, lastUpdate: new Date() },
      });
      logger.info(
        { statId: stat.id, channelId: channel.id, type: stat.type, value: initialValue },
        "Server-Stat-Channel erstellt",
      );
    } catch (err) {
      logger.warn({ err, statId: stat.id, type: stat.type }, "Konnte Stat-Channel nicht anlegen");
    }
  }
}

// Aktualisiert die Channel-Namen aller aktiven Stats. Bei `force=true` wird
// der Channel auch dann umbenannt, wenn der Name bereits stimmt (z.B. für
// manuelles Trigger via Dashboard).
export async function updateAllStats(
  client: Client,
  force = false,
): Promise<{ updated: number; skipped: number; alreadyCurrent: number }> {
  const config = await getConfig();
  if (!config.serverStatsEnabled) return { updated: 0, skipped: 0, alreadyCurrent: 0 };

  const guild = await getGuild(client);
  if (!guild) return { updated: 0, skipped: 0, alreadyCurrent: 0 };

  const stats = await prisma.serverStat.findMany({
    where: { enabled: true, channelId: { not: null } },
  });

  let updated = 0;
  let skipped = 0;
  let alreadyCurrent = 0;
  const now = new Date();

  for (const stat of stats) {
    if (!isStatType(stat.type)) continue;
    if (!stat.channelId) continue;

    const value = await computeStatValue(guild, stat.type);
    logger.debug(
      { statId: stat.id, type: stat.type, value, lastValue: stat.lastValue },
      "ServerStats: Wert berechnet",
    );

    const channel = await guild.channels.fetch(stat.channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      // Channel weg → Eintrag bereinigen
      await prisma.serverStat.update({ where: { id: stat.id }, data: { channelId: null } });
      continue;
    }

    const newName = renderName(stat.nameTemplate, value);
    const currentName = (channel as VoiceChannel).name;

    // lastCheck IMMER setzen — beweist im Dashboard dass der Scheduler läuft.
    const baseUpdate = { lastCheck: now };

    // Im normalen Lauf: skippen wenn Wert unverändert (Rate-Limit-Schonung).
    // Bei force=true (Manual-Trigger): nur skippen wenn Name bereits stimmt.
    if (!force && stat.lastValue === value && currentName === newName) {
      await prisma.serverStat.update({
        where: { id: stat.id },
        data: { ...baseUpdate, lastValue: value },
      });
      skipped += 1;
      continue;
    }
    if (currentName === newName) {
      // Name passt schon — DB nur aktualisieren, kein Discord-Call
      await prisma.serverStat.update({
        where: { id: stat.id },
        data: { ...baseUpdate, lastValue: value, lastUpdate: now },
      });
      alreadyCurrent += 1;
      continue;
    }

    try {
      await channel.setName(newName, "Server-Stats-Update");
      await prisma.serverStat.update({
        where: { id: stat.id },
        data: { ...baseUpdate, lastValue: value, lastUpdate: now },
      });
      logger.info(
        { statId: stat.id, oldName: currentName, newName, value },
        "ServerStats: Channel umbenannt",
      );
      updated += 1;
    } catch (err) {
      // Discord rate-limited Channel-Edits stark (~2 pro 10 min) — bei Fehler
      // einfach weiter, nächster Lauf versucht's wieder.
      await prisma.serverStat.update({
        where: { id: stat.id },
        data: baseUpdate,
      });
      logger.warn(
        { err, statId: stat.id, channelId: stat.channelId },
        "Server-Stat-Channel-Update fehlgeschlagen",
      );
    }
  }

  logger.info(
    { updated, skipped, alreadyCurrent, statCount: stats.length, force },
    "ServerStats: Tick abgeschlossen",
  );
  return { updated, skipped, alreadyCurrent };
}

let schedulerRunning = false;

// Liest das Intervall vor jedem Tick aus der DB — Änderungen am
// Update-Intervall im Dashboard greifen sofort beim nächsten Lauf.
async function tickAndReschedule(client: Client): Promise<void> {
  logger.info("ServerStats: Tick startet");
  try {
    await updateAllStats(client);
  } catch (err) {
    logger.error({ err }, "ServerStats: Update-Lauf fehlgeschlagen");
  }
  try {
    const config = await getConfig();
    const minutes = Math.max(1, Math.min(120, config.serverStatsUpdateMinutes));
    logger.info({ nextInMinutes: minutes }, "ServerStats: Nächster Tick geplant");
    setTimeout(() => void tickAndReschedule(client), minutes * 60_000);
  } catch (err) {
    logger.error({ err }, "ServerStats: Reschedule fehlgeschlagen — Fallback 10 min");
    setTimeout(() => void tickAndReschedule(client), 10 * 60_000);
  }
}

export function startServerStatsScheduler(client: Client): void {
  if (schedulerRunning) return;
  schedulerRunning = true;

  // Initial: Channels anlegen + erstes Update nach 15s
  setTimeout(() => {
    void (async () => {
      await ensureStatChannels(client).catch((err) =>
        logger.error({ err }, "ServerStats: ensureStatChannels fehlgeschlagen"),
      );
      await tickAndReschedule(client);
    })();
  }, 15_000);
  logger.info("Server-Stats-Scheduler gestartet (dynamisches Intervall aus Config)");
}
