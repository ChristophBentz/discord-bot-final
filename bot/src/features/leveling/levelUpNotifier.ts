import { type Client, type TextChannel, EmbedBuilder } from "discord.js";
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

    const embed = new EmbedBuilder()
      .setColor(0xfaa61a)
      .setDescription(`<@${args.userId}> ist auf **Level ${args.newLevel}** aufgestiegen.`);

    await (channel as TextChannel).send({ embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "Level-Up-Ankündigung fehlgeschlagen");
  }
}
