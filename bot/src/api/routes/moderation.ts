import { EmbedBuilder, type Client, type TextChannel, type GuildMember } from "discord.js";
import { prisma } from "@repo/db";
import { env } from "../../lib/env.js";
import { appealUrl } from "../../lib/appealToken.js";
import { logger } from "../../lib/logger.js";
import { isMemberProtected } from "../../features/members/service.js";

const PROTECTED_ERROR =
  "Dieser User hat Admin- oder Mod-Permissions und kann nicht durch den Bot kicked/banned/timeouted werden.";

export interface ModBody {
  reason?: string;
  moderatorId?: string;
  moderatorName?: string;
}

export interface TimeoutBody extends ModBody {
  /** Dauer in Sekunden. Max 28 Tage = 2_419_200. */
  durationSeconds?: number;
}

export interface BanBody extends ModBody {
  /** Wie viele Tage Nachrichten gelöscht werden (0-7). */
  deleteMessageDays?: number;
}

export type ModResult =
  | { ok: true; dmSent: boolean; dmError?: string }
  | { ok: false; error: string };

const MAX_REASON = 500;
const MAX_TIMEOUT_SECONDS = 28 * 24 * 60 * 60; // 28 Tage

function validateReason(raw: string | undefined): string | { error: string } {
  const reason = (raw ?? "").trim();
  if (!reason) return { error: "Grund darf nicht leer sein" };
  if (reason.length > MAX_REASON) return { error: `Maximal ${MAX_REASON} Zeichen` };
  return reason;
}

async function getMember(client: Client, userId: string): Promise<GuildMember | null> {
  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return null;
  return guild.members.fetch(userId).catch(() => null);
}

async function sendDM(args: {
  client: Client;
  userId: string;
  title: string;
  description: string;
  reason: string;
  moderatorName: string;
  color: number;
  extraField?: { name: string; value: string; inline?: boolean };
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const user = await args.client.users.fetch(args.userId);
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    const embed = new EmbedBuilder()
      .setColor(args.color)
      .setTitle(args.title)
      .setDescription(args.description)
      .addFields(
        { name: "Grund", value: args.reason },
        { name: "Moderator", value: args.moderatorName, inline: true },
      )
      .setTimestamp(new Date());
    if (args.extraField) embed.addFields(args.extraField);
    if (config?.guildIconUrl) embed.setThumbnail(config.guildIconUrl);
    await user.send({ embeds: [embed] });
    return { sent: true };
  } catch (err) {
    const msg =
      err instanceof Error && err.message.includes("Cannot send messages to this user")
        ? "User hat DMs deaktiviert"
        : "DM konnte nicht zugestellt werden";
    logger.warn({ err, userId: args.userId }, "Mod-DM fehlgeschlagen");
    return { sent: false, error: msg };
  }
}

async function sendLog(args: {
  client: Client;
  userId: string;
  member: GuildMember | null;
  title: string;
  color: number;
  reason: string;
  moderatorName: string;
  moderatorId: string;
  dmSent: boolean;
  dmError?: string;
  extraField?: { name: string; value: string; inline?: boolean };
}): Promise<void> {
  try {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (!config?.logChannelId) return;
    const channel = await args.client.channels.fetch(config.logChannelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel)) return;

    const embed = new EmbedBuilder()
      .setColor(args.color)
      .setAuthor(
        args.member
          ? {
              name: args.member.user.username,
              iconURL: args.member.user.displayAvatarURL({ size: 64 }),
            }
          : { name: `User ${args.userId}` },
      )
      .setTitle(args.title)
      .setDescription(`<@${args.userId}>`)
      .addFields(
        { name: "Grund", value: args.reason },
        {
          name: "Moderator",
          value: `${args.moderatorName} (\`${args.moderatorId}\`)`,
          inline: true,
        },
        {
          name: "DM-Status",
          value: args.dmSent ? "✅ Zugestellt" : `❌ ${args.dmError ?? "Fehlgeschlagen"}`,
          inline: true,
        },
      )
      .setTimestamp(new Date())
      .setFooter({ text: `User-ID: ${args.userId}` });
    if (args.extraField) embed.addFields(args.extraField);

    await (channel as TextChannel).send({ embeds: [embed] });
  } catch (err) {
    logger.warn({ err }, "Mod-Log-Embed fehlgeschlagen");
  }
}

// ─── TIMEOUT ───────────────────────────────────────────────────────────────
export async function handleTimeout(
  client: Client,
  userId: string,
  body: TimeoutBody,
): Promise<ModResult> {
  const reasonOrError = validateReason(body.reason);
  if (typeof reasonOrError !== "string") return { ok: false, error: reasonOrError.error };
  const reason = reasonOrError;

  const seconds = Math.max(1, Math.floor(body.durationSeconds ?? 0));
  if (seconds === 0) return { ok: false, error: "Dauer muss > 0 sein" };
  if (seconds > MAX_TIMEOUT_SECONDS) {
    return { ok: false, error: "Maximal 28 Tage" };
  }

  const moderatorName = (body.moderatorName ?? "Staff").trim() || "Staff";
  const moderatorId = (body.moderatorId ?? "unknown").trim() || "unknown";

  const member = await getMember(client, userId);
  if (!member) return { ok: false, error: "Member nicht gefunden" };
  if (isMemberProtected(member)) return { ok: false, error: PROTECTED_ERROR };

  // DM zuerst, dann Timeout
  const durationLabel = formatDuration(seconds);
  const dm = await sendDM({
    client,
    userId,
    title: "⏱️ Du wurdest stummgeschaltet",
    description: `Du kannst auf dem Server für **${durationLabel}** nicht mehr schreiben.`,
    reason,
    moderatorName,
    color: 0xfa8c16,
    extraField: { name: "Dauer", value: durationLabel, inline: true },
  });

  try {
    await member.timeout(seconds * 1000, `${moderatorName} (Dashboard): ${reason}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("50013") || msg.toLowerCase().includes("missing permissions")) {
      return { ok: false, error: "Bot-Rolle muss höher sein als der Ziel-User." };
    }
    return { ok: false, error: msg };
  }

  await sendLog({
    client,
    userId,
    member,
    title: "Timeout gesetzt",
    color: 0xfa8c16,
    reason,
    moderatorName,
    moderatorId,
    dmSent: dm.sent,
    dmError: dm.error,
    extraField: { name: "Dauer", value: durationLabel, inline: true },
  });

  logger.info({ userId, moderatorId, seconds }, "Timeout gesetzt");
  return { ok: true, dmSent: dm.sent, dmError: dm.error };
}

// ─── KICK ──────────────────────────────────────────────────────────────────
export async function handleKick(
  client: Client,
  userId: string,
  body: ModBody,
): Promise<ModResult> {
  const reasonOrError = validateReason(body.reason);
  if (typeof reasonOrError !== "string") return { ok: false, error: reasonOrError.error };
  const reason = reasonOrError;

  const moderatorName = (body.moderatorName ?? "Staff").trim() || "Staff";
  const moderatorId = (body.moderatorId ?? "unknown").trim() || "unknown";

  const member = await getMember(client, userId);
  if (!member) return { ok: false, error: "Member nicht gefunden" };
  if (isMemberProtected(member)) return { ok: false, error: PROTECTED_ERROR };

  // DM ZUERST — nach dem Kick kann der Bot ihn nicht mehr erreichen
  const dm = await sendDM({
    client,
    userId,
    title: "👋 Du wurdest aus dem Server geworfen",
    description: "Du kannst dem Server jederzeit über einen neuen Invite wieder beitreten.",
    reason,
    moderatorName,
    color: 0xed4245,
  });

  try {
    await member.kick(`${moderatorName} (Dashboard): ${reason}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("50013") || msg.toLowerCase().includes("missing permissions")) {
      return { ok: false, error: "Bot-Rolle muss höher sein als der Ziel-User." };
    }
    return { ok: false, error: msg };
  }

  await sendLog({
    client,
    userId,
    member,
    title: "Member gekickt",
    color: 0xed4245,
    reason,
    moderatorName,
    moderatorId,
    dmSent: dm.sent,
    dmError: dm.error,
  });

  logger.info({ userId, moderatorId }, "Member gekickt");
  return { ok: true, dmSent: dm.sent, dmError: dm.error };
}

// ─── BAN ───────────────────────────────────────────────────────────────────
export async function handleBan(
  client: Client,
  userId: string,
  body: BanBody,
): Promise<ModResult> {
  const reasonOrError = validateReason(body.reason);
  if (typeof reasonOrError !== "string") return { ok: false, error: reasonOrError.error };
  const reason = reasonOrError;

  const moderatorName = (body.moderatorName ?? "Staff").trim() || "Staff";
  const moderatorId = (body.moderatorId ?? "unknown").trim() || "unknown";

  const deleteDays = Math.max(0, Math.min(7, Math.floor(body.deleteMessageDays ?? 0)));
  const deleteMessageSeconds = deleteDays * 24 * 60 * 60;

  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return { ok: false, error: "Guild nicht im Cache" };

  const member = await getMember(client, userId);
  // Wenn Member im Server ist und Mod/Admin → blockieren. User ohne Membership darf gebannt werden.
  if (member && isMemberProtected(member)) {
    return { ok: false, error: PROTECTED_ERROR };
  }

  // DM ZUERST — nach dem Ban kann der Bot ihn nicht mehr erreichen
  const dm = await sendDM({
    client,
    userId,
    title: "⛔ Du wurdest gebannt",
    description: "Du wurdest dauerhaft vom Server ausgeschlossen.",
    reason,
    moderatorName,
    color: 0x992d22,
    extraField: {
      name: "Einspruch einlegen",
      value: `Du kannst [hier einen Entbannungsantrag stellen](${appealUrl(userId)}). Heb dir den Link auf — darüber siehst du auch den Status deines Antrags.`,
    },
  });

  try {
    await guild.bans.create(userId, {
      reason: `${moderatorName} (Dashboard): ${reason}`,
      deleteMessageSeconds,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("50013") || msg.toLowerCase().includes("missing permissions")) {
      return { ok: false, error: "Bot-Rolle muss höher sein als der Ziel-User." };
    }
    return { ok: false, error: msg };
  }

  await sendLog({
    client,
    userId,
    member,
    title: "Member gebannt",
    color: 0x992d22,
    reason,
    moderatorName,
    moderatorId,
    dmSent: dm.sent,
    dmError: dm.error,
    extraField:
      deleteDays > 0
        ? { name: "Nachrichten gelöscht", value: `${deleteDays} Tage`, inline: true }
        : undefined,
  });

  logger.info({ userId, moderatorId, deleteDays }, "Member gebannt");
  return { ok: true, dmSent: dm.sent, dmError: dm.error };
}

// ─── UNBAN ─────────────────────────────────────────────────────────────────
export async function handleUnban(
  client: Client,
  userId: string,
  body: ModBody,
): Promise<ModResult> {
  const moderatorName = (body.moderatorName ?? "Staff").trim() || "Staff";
  const moderatorId = (body.moderatorId ?? "unknown").trim() || "unknown";
  const reason = (body.reason ?? "").trim() || "Aufgehoben via Dashboard";

  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return { ok: false, error: "Guild nicht im Cache" };

  try {
    await guild.bans.remove(userId, `${moderatorName} (Dashboard): ${reason}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("10026") || msg.toLowerCase().includes("unknown ban")) {
      return { ok: false, error: "User ist nicht gebannt" };
    }
    return { ok: false, error: msg };
  }

  try {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (config?.logChannelId) {
      const channel = await client.channels.fetch(config.logChannelId).catch(() => null);
      if (channel?.isTextBased() && "send" in channel) {
        const user = await client.users.fetch(userId).catch(() => null);
        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setAuthor(
            user
              ? { name: user.username, iconURL: user.displayAvatarURL({ size: 64 }) }
              : { name: `User ${userId}` },
          )
          .setTitle("Ban aufgehoben")
          .setDescription(`<@${userId}>`)
          .addFields(
            { name: "Grund", value: reason },
            { name: "Moderator", value: `${moderatorName} (\`${moderatorId}\`)`, inline: true },
          )
          .setTimestamp(new Date())
          .setFooter({ text: `User-ID: ${userId}` });
        await (channel as TextChannel).send({ embeds: [embed] });
      }
    }
  } catch (err) {
    logger.warn({ err }, "Unban-Log-Embed fehlgeschlagen");
  }

  logger.info({ userId, moderatorId }, "Ban aufgehoben");
  return { ok: true, dmSent: false };
}

// ─── TIMEOUT AUFHEBEN ──────────────────────────────────────────────────────
export async function handleRemoveTimeout(
  client: Client,
  userId: string,
  body: ModBody,
): Promise<ModResult> {
  const moderatorName = (body.moderatorName ?? "Staff").trim() || "Staff";
  const moderatorId = (body.moderatorId ?? "unknown").trim() || "unknown";
  const reason = (body.reason ?? "").trim() || "Aufgehoben via Dashboard";

  const member = await getMember(client, userId);
  if (!member) return { ok: false, error: "Member nicht gefunden" };

  try {
    await member.timeout(null, `${moderatorName} (Dashboard): ${reason}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }

  try {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (config?.logChannelId) {
      const channel = await client.channels.fetch(config.logChannelId).catch(() => null);
      if (channel?.isTextBased() && "send" in channel) {
        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setAuthor({
            name: member.user.username,
            iconURL: member.user.displayAvatarURL({ size: 64 }),
          })
          .setTitle("Timeout aufgehoben")
          .setDescription(`<@${userId}>`)
          .addFields(
            { name: "Grund", value: reason },
            { name: "Moderator", value: `${moderatorName} (\`${moderatorId}\`)`, inline: true },
          )
          .setTimestamp(new Date())
          .setFooter({ text: `User-ID: ${userId}` });
        await (channel as TextChannel).send({ embeds: [embed] });
      }
    }
  } catch (err) {
    logger.warn({ err }, "Untimeout-Log-Embed fehlgeschlagen");
  }

  logger.info({ userId, moderatorId }, "Timeout aufgehoben");
  return { ok: true, dmSent: false };
}

// ─── STATE: aktive Timeouts + Bans ─────────────────────────────────────────
export interface ModerationState {
  timeouts: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    until: number;
  }>;
  bans: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    reason: string | null;
  }>;
}

export async function getModerationState(client: Client): Promise<ModerationState> {
  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return { timeouts: [], bans: [] };

  const now = Date.now();
  const timeouts: ModerationState["timeouts"] = [];
  for (const member of guild.members.cache.values()) {
    const until = member.communicationDisabledUntilTimestamp;
    if (until && until > now) {
      timeouts.push({
        userId: member.id,
        username: member.user.username,
        displayName: member.displayName,
        avatarUrl: member.user.displayAvatarURL({ size: 64 }),
        until,
      });
    }
  }
  timeouts.sort((a, b) => a.until - b.until);

  const bans: ModerationState["bans"] = [];
  try {
    const banList = await guild.bans.fetch();
    for (const ban of banList.values()) {
      bans.push({
        userId: ban.user.id,
        username: ban.user.username,
        displayName: ban.user.globalName ?? ban.user.username,
        avatarUrl: ban.user.displayAvatarURL({ size: 64 }),
        reason: ban.reason ?? null,
      });
    }
  } catch (err) {
    logger.warn({ err }, "Ban-Liste konnte nicht geladen werden");
  }

  return { timeouts, bans };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} Minuten`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Stunden`;
  const days = Math.floor(hours / 24);
  return `${days} Tage`;
}
