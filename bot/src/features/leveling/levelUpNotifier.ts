import { type Client, type TextChannel } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";

// Platzhalter-Ersetzung für die Level-Up-Nachricht.
// Erlaubt: {user} {username} {level} {server}
export function renderLevelUpMessage(
  template: string,
  args: { userId: string; username: string; level: number; serverName: string },
): string {
  return template
    .replaceAll("{user}", `<@${args.userId}>`)
    .replaceAll("{username}", args.username)
    .replaceAll("{level}", String(args.level))
    .replaceAll("{server}", args.serverName);
}

// Schickt eine Level-Up-Nachricht in den konfigurierten Channel (falls gesetzt).
export async function announceLevelUp(args: {
  client: Client;
  userId: string;
  newLevel: number;
  fallbackChannelId?: string;
}): Promise<void> {
  try {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    const channelId = config?.levelUpChannelId ?? args.fallbackChannelId;
    if (!channelId) return;

    const channel = await args.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel)) return;

    // Username aus der Member-Tabelle für den {username}-Platzhalter
    const member = await prisma.member.findUnique({
      where: { userId: args.userId },
      select: { displayName: true, username: true },
    });
    const username = member?.displayName ?? member?.username ?? "User";

    const template =
      config?.levelUpMessage?.trim() ||
      "🎉 {user} ist auf **Level {level}** aufgestiegen!";

    const content = renderLevelUpMessage(template, {
      userId: args.userId,
      username,
      level: args.newLevel,
      serverName: config?.guildName ?? "dem Server",
    });

    await (channel as TextChannel).send({
      content,
      // parse: [] = Mention wird klickbar gerendert, aber niemand wird gepingt
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    logger.error({ err }, "Level-Up-Ankündigung fehlgeschlagen");
  }
}
