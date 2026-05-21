import type { Client, GuildBasedChannel } from "discord.js";
import { ChannelType } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { env } from "../../lib/env.js";

// Welche Channel-Typen wir tracken. Voice + Category brauchen wir für den ChannelPicker im Dashboard.
const TRACKED_TYPES = new Set<number>([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
  ChannelType.GuildCategory,
]);

export async function upsertChannel(channel: GuildBasedChannel): Promise<void> {
  if (!TRACKED_TYPES.has(channel.type)) return;
  const position = "position" in channel ? channel.position : 0;
  await prisma.guildChannel.upsert({
    where: { channelId: channel.id },
    update: {
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId ?? null,
      position,
    },
    create: {
      channelId: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId ?? null,
      position,
    },
  });
}

export async function deleteChannel(channelId: string): Promise<void> {
  await prisma.guildChannel.delete({ where: { channelId } }).catch(() => {});
}

export async function bulkSyncChannels(client: Client): Promise<void> {
  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return;
  try {
    const channels = await guild.channels.fetch();
    let count = 0;
    for (const channel of channels.values()) {
      if (!channel) continue;
      if (TRACKED_TYPES.has(channel.type)) {
        await upsertChannel(channel);
        count += 1;
      }
    }
    logger.info({ count }, "Channels synchronisiert");
  } catch (err) {
    logger.error({ err }, "Channel-Sync fehlgeschlagen");
  }
}
