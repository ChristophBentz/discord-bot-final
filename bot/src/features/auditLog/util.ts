import { ChannelType, type AuditLogEvent, type Guild } from "discord.js";
import { fetchAuditExecutor, type AuditExecutor } from "./service.js";

/**
 * Executor einer Aktion ermitteln und Bot-eigene Aktionen ausfiltern.
 * Ohne den Filter spammen Temp-Channels (Create/Delete), Server-Stats
 * (Channel-Renames) und Tickets (Threads) das Audit-Log voll.
 */
export async function executorUnlessSelf(
  guild: Guild,
  type: AuditLogEvent,
  targetId: string,
): Promise<{ skip: boolean; executor: AuditExecutor | null }> {
  const { executor } = await fetchAuditExecutor(guild, type, targetId);
  const selfId = guild.client.user?.id;
  return {
    skip: Boolean(executor && selfId && executor.id === selfId),
    executor,
  };
}

const TYPE_LABELS: Partial<Record<ChannelType, string>> = {
  [ChannelType.GuildText]: "Text",
  [ChannelType.GuildVoice]: "Voice",
  [ChannelType.GuildCategory]: "Kategorie",
  [ChannelType.GuildAnnouncement]: "Ankündigungen",
  [ChannelType.GuildStageVoice]: "Stage",
  [ChannelType.GuildForum]: "Forum",
  [ChannelType.PublicThread]: "Thread",
  [ChannelType.PrivateThread]: "Privater Thread",
  [ChannelType.AnnouncementThread]: "Ankündigungs-Thread",
};

export function channelTypeLabel(type: ChannelType): string {
  return TYPE_LABELS[type] ?? "Channel";
}
