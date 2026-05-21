import {
  EmbedBuilder,
  type Client,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { prisma, type Config } from "@repo/db";
import { logger } from "../../lib/logger.js";

// Ersetzt {user}, {username}, {server}, {memberCount} im Template.
export function replacePlaceholders(
  template: string,
  args: {
    userId: string;
    username: string;
    serverName: string;
    memberCount: number;
  },
): string {
  return template
    .replace(/\{user\}/g, `<@${args.userId}>`)
    .replace(/\{username\}/g, args.username)
    .replace(/\{server\}/g, args.serverName)
    .replace(/\{memberCount\}/g, String(args.memberCount));
}

export async function applyAutoRoles(member: GuildMember, config: Config): Promise<void> {
  if (!config.autoRolesEnabled) return;
  const roles = await prisma.autoRole.findMany({ select: { roleId: true } });
  if (roles.length === 0) return;
  const ids = roles.map((r) => r.roleId);
  try {
    await member.roles.add(ids, "Auto-Rolle bei Beitritt");
    logger.info({ userId: member.id, count: ids.length }, "Auto-Rollen vergeben");
  } catch (err) {
    logger.warn({ err, userId: member.id }, "Auto-Rollen-Vergabe fehlgeschlagen");
  }
}

export async function sendWelcome(
  client: Client,
  member: GuildMember,
  config: Config,
): Promise<void> {
  if (!config.welcomeEnabled || !config.welcomeChannelId || !config.welcomeMessage) return;
  try {
    const channel = await client.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel)) return;

    const text = replacePlaceholders(config.welcomeMessage, {
      userId: member.id,
      username: member.user.username,
      serverName: config.guildName ?? member.guild.name,
      memberCount: member.guild.memberCount,
    });

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setAuthor({
        name: `Willkommen, ${member.displayName}!`,
        iconURL: member.user.displayAvatarURL({ size: 64 }),
      })
      .setDescription(text)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: `Member #${member.guild.memberCount}` })
      .setTimestamp(new Date());

    await (channel as TextChannel).send({ content: `<@${member.id}>`, embeds: [embed] });
  } catch (err) {
    logger.warn({ err, userId: member.id }, "Welcome-Message fehlgeschlagen");
  }
}

export async function sendLeave(
  client: Client,
  member: { id: string; username: string; avatarUrl: string; displayName: string },
  guildMemberCount: number,
  config: Config,
): Promise<void> {
  if (!config.leaveEnabled || !config.leaveChannelId || !config.leaveMessage) return;
  try {
    const channel = await client.channels.fetch(config.leaveChannelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel)) return;

    const text = replacePlaceholders(config.leaveMessage, {
      userId: member.id,
      username: member.username,
      serverName: config.guildName ?? "dem Server",
      memberCount: guildMemberCount,
    });

    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setAuthor({
        name: `Auf Wiedersehen, ${member.displayName}`,
        iconURL: member.avatarUrl,
      })
      .setDescription(text)
      .setFooter({ text: `Verbleibend: ${guildMemberCount} Member` })
      .setTimestamp(new Date());

    await (channel as TextChannel).send({ embeds: [embed] });
  } catch (err) {
    logger.warn({ err, userId: member.id }, "Leave-Message fehlgeschlagen");
  }
}
