import {
  type Client,
  type EmbedBuilder,
  type Guild,
  type TextChannel,
  type User,
  type AuditLogEvent,
} from "discord.js";
import { prisma, type Config } from "@repo/db";
import { logger } from "../../lib/logger.js";

// Welche Toggles aus der Config dürfen welche Kategorie auslösen.
export type LogCategory =
  | "messageDelete"
  | "messageEdit"
  | "memberJoin"
  | "memberLeave"
  | "memberBan"
  | "memberUnban"
  | "memberNickname"
  | "memberRoles"
  | "voice"
  | "moderation";

const TOGGLE_MAP: Record<LogCategory, keyof Config> = {
  messageDelete: "logMessageDelete",
  messageEdit: "logMessageEdit",
  memberJoin: "logMemberJoin",
  memberLeave: "logMemberLeave",
  memberBan: "logMemberBan",
  memberUnban: "logMemberUnban",
  memberNickname: "logMemberNickname",
  memberRoles: "logMemberRoles",
  voice: "logVoice",
  moderation: "logModeration",
};

// Carl-Bot-ähnliche Farbpalette.
export const LOG_COLORS = {
  delete: 0xed4245, // Rot
  edit: 0xfaa61a, // Gelb/Orange
  join: 0x57f287, // Grün
  leave: 0x95a5a6, // Grau
  ban: 0x992d22, // Dunkelrot
  unban: 0x2ecc71, // Hellgrün
  update: 0x5865f2, // Blurple
  voiceJoin: 0x57f287, // Grün
  voiceLeave: 0xed4245, // Rot
  voiceMove: 0x3498db, // Hellblau
} as const;

// In-Memory-Cache, damit nicht jeder Event-Trigger die DB hit.
let cached: Config | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 15_000;

async function getCachedConfig(): Promise<Config | null> {
  if (cached && Date.now() < cacheExpiresAt) return cached;
  cached = await prisma.config.findUnique({ where: { id: 1 } });
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cached;
}

// Hauptfunktion: bekommt eine Kategorie + einen fertigen Embed und entscheidet, ob/wohin gesendet wird.
export async function sendLog(
  client: Client,
  category: LogCategory,
  embed: EmbedBuilder,
): Promise<void> {
  try {
    const config = await getCachedConfig();
    if (!config?.logChannelId) return;
    if (!config[TOGGLE_MAP[category]]) return;

    const channel = await client.channels.fetch(config.logChannelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel)) {
      logger.warn({ channelId: config.logChannelId }, "Log-Channel ist kein Text-Channel");
      return;
    }

    await (channel as TextChannel).send({ embeds: [embed] });
  } catch (err) {
    logger.error({ err, category }, "Audit-Log konnte nicht gesendet werden");
  }
}

// Damit die Web-Seite den Cache invalidieren könnte (für später, wenn wir IPC machen).
export function invalidateAuditLogCache(): void {
  cached = null;
  cacheExpiresAt = 0;
}

// Audit-Logs liefern teils PartialUser — wir brauchen aber nur id für die Embeds.
export interface AuditExecutor {
  id: string;
}

// Findet den Ausführer einer kürzlichen Audit-Log-Aktion (z.B. wer die Rolle vergeben hat).
// Discord populated den Eintrag i.d.R. innerhalb 1-2 Sekunden.
export async function fetchAuditExecutor(
  guild: Guild,
  type: AuditLogEvent,
  targetId: string,
  windowMs = 5000,
): Promise<{ executor: AuditExecutor | null; reason: string | null }> {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find(
      (e) => e.targetId === targetId && Date.now() - e.createdTimestamp < windowMs,
    );
    return {
      executor: entry?.executor ? { id: entry.executor.id } : null,
      reason: entry?.reason ?? null,
    };
  } catch (err) {
    logger.warn({ err }, "Audit-Log-Abruf fehlgeschlagen (Bot ohne 'View Audit Log'?)");
    return { executor: null, reason: null };
  }
}
