import { type Client, type TextChannel } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";

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

    await (channel as TextChannel).send({
      content: `🎉 <@${args.userId}> ist auf **Level ${args.newLevel}** aufgestiegen!`,
      // parse: [] = Mention wird klickbar gerendert, aber niemand wird gepingt
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    logger.error({ err }, "Level-Up-Ankündigung fehlgeschlagen");
  }
}
