import {
  ChannelType,
  PermissionFlagsBits,
  type CategoryChannel,
  type Client,
  type Guild,
  type VoiceChannel,
  type VoiceState,
} from "discord.js";
import { prisma, type Config, type TempChannelTrigger } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { env } from "../../lib/env.js";
import { buildPanel } from "./panel.js";

function renderName(template: string, state: VoiceState): string {
  const username = state.member?.user.username ?? "user";
  const nick = state.member?.displayName ?? username;
  return template.replace(/\{user\}/g, username).replace(/\{nick\}/g, nick);
}

// Findet den Trigger für die übergebene Channel-ID (oder null).
export async function findTrigger(channelId: string): Promise<TempChannelTrigger | null> {
  return prisma.tempChannelTrigger.findUnique({ where: { channelId } });
}

// Erstellt einen Temp-Voice-Channel und verschiebt den User hinein.
export async function createTempChannel(
  state: VoiceState,
  config: Config,
  trigger: TempChannelTrigger,
): Promise<void> {
  if (!state.member) return;
  const guild = state.guild;

  let parent: CategoryChannel | null = null;
  if (config.tempChannelCategoryId) {
    const candidate = await guild.channels
      .fetch(config.tempChannelCategoryId)
      .catch(() => null);
    if (candidate?.type === ChannelType.GuildCategory) {
      parent = candidate;
    }
  }
  // Fallback: gleiche Kategorie wie der Trigger-Channel
  if (!parent && state.channel?.parent && state.channel.parent.type === ChannelType.GuildCategory) {
    parent = state.channel.parent;
  }

  const template = trigger.nameTemplate ?? config.tempChannelNameTemplate;

  try {
    const channel = (await guild.channels.create({
      name: renderName(template, state),
      type: ChannelType.GuildVoice,
      parent: parent?.id,
      userLimit: trigger.userLimit > 0 ? trigger.userLimit : undefined,
      permissionOverwrites: [
        {
          id: state.member.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
        },
      ],
      reason: `Temp-Channel für ${state.member.user.username}`,
    })) as VoiceChannel;

    await state.member.voice.setChannel(channel).catch((err) => {
      logger.warn({ err, userId: state.member?.id }, "Konnte User nicht in Temp-Channel moven");
    });

    // Kontroll-Panel ins Voice-Text-Chat posten
    let panelMessageId: string | null = null;
    try {
      const panelMsg = await channel.send(buildPanel(channel, state.member.id));
      panelMessageId = panelMsg.id;
    } catch (err) {
      logger.warn({ err, channelId: channel.id }, "Panel-Message konnte nicht gepostet werden");
    }

    await prisma.tempChannel.create({
      data: { channelId: channel.id, ownerId: state.member.id, panelMessageId },
    });

    logger.info(
      { channelId: channel.id, ownerId: state.member.id, name: channel.name, limit: trigger.userLimit },
      "Temp-Channel erstellt",
    );
  } catch (err) {
    logger.error({ err, userId: state.member.id }, "Temp-Channel-Erstellung fehlgeschlagen");
  }
}

// Zählt nur menschliche User im Voice-Channel (Bots zählen nicht für „leer").
function humanMemberCount(channel: VoiceChannel): number {
  let count = 0;
  for (const m of channel.members.values()) {
    if (!m.user.bot) count += 1;
  }
  return count;
}

// Löscht einen Temp-Channel, wenn er leer ist und in unserer Tabelle steht.
export async function maybeDeleteTempChannel(
  client: Client,
  channelId: string,
): Promise<void> {
  const record = await prisma.tempChannel.findUnique({ where: { channelId } });
  if (!record) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    await prisma.tempChannel.delete({ where: { channelId } }).catch(() => {});
    return;
  }

  if (channel.type !== ChannelType.GuildVoice) return;
  const voice = channel as VoiceChannel;
  if (humanMemberCount(voice) > 0) return;

  try {
    await voice.delete("Temp-Channel ist leer");
    await prisma.tempChannel.delete({ where: { channelId } });
    logger.info({ channelId }, "Temp-Channel gelöscht");
  } catch (err) {
    logger.warn({ err, channelId }, "Temp-Channel-Löschung fehlgeschlagen");
  }
}

// Periodischer Cleanup-Lauf — fängt Fälle ab, wo voiceStateUpdate aus
// irgendwelchen Gründen verschluckt wurde (z.B. Race nach Permission-
// Update durch Lock-Aktion).
export function startTempChannelSweeper(client: Client): void {
  const INTERVAL_MS = 60_000;
  setInterval(async () => {
    try {
      const records = await prisma.tempChannel.findMany();
      for (const r of records) {
        await maybeDeleteTempChannel(client, r.channelId);
      }
    } catch (err) {
      logger.warn({ err }, "Temp-Channel-Sweeper-Lauf fehlgeschlagen");
    }
  }, INTERVAL_MS);
  logger.info({ intervalMs: INTERVAL_MS }, "Temp-Channel-Sweeper gestartet");
}

// Beim Bot-Start: alle leeren Temp-Channels aufräumen.
export async function cleanupOrphanedTempChannels(client: Client): Promise<void> {
  const records = await prisma.tempChannel.findMany();
  if (records.length === 0) return;

  let removed = 0;
  for (const r of records) {
    const channel = await client.channels.fetch(r.channelId).catch(() => null);
    if (!channel) {
      await prisma.tempChannel.delete({ where: { channelId: r.channelId } }).catch(() => {});
      removed += 1;
      continue;
    }
    if (channel.type === ChannelType.GuildVoice) {
      const voice = channel as VoiceChannel;
      if (voice.members.size === 0) {
        await voice.delete("Cleanup leerer Temp-Channels beim Start").catch(() => {});
        await prisma.tempChannel.delete({ where: { channelId: r.channelId } }).catch(() => {});
        removed += 1;
      }
    }
  }
  if (removed > 0) logger.info({ removed }, "Verwaiste Temp-Channels aufgeräumt");
}

export async function isTempChannel(channelId: string): Promise<boolean> {
  const count = await prisma.tempChannel.count({ where: { channelId } });
  return count > 0;
}

export function getMainGuild(client: Client): Guild | null {
  return client.guilds.cache.get(env.DISCORD_GUILD_ID) ?? null;
}
