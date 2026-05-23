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
import { buildPanel, isChannelLocked } from "./panel.js";

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

    // Bot-eigene Permissions NACH dem Create setzen — als getrennter Call,
    // damit ein Permission-Konflikt das Create nicht killt. Fail-safe:
    // wenn's nicht klappt, läuft alles andere trotzdem (Self-Heal greift
    // beim Sweep). ManageRoles weggelassen, weil das eine privilegierte
    // Permission ist die Discord beim Granten manchmal blockiert.
    const botMember = guild.members.me;
    if (botMember) {
      await channel.permissionOverwrites
        .edit(botMember.id, {
          ViewChannel: true,
          ManageChannels: true,
          Connect: true,
          MoveMembers: true,
        })
        .catch((err: unknown) => {
          const e = err as { code?: number; message?: string };
          logger.warn(
            `TempChannel Bot-Permission setzen fehlgeschlagen [${channel.id}] code=${e?.code} msg=${e?.message}`,
          );
        });
    }

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
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string; status?: number };
    logger.error(
      `TempChannel Create fehlgeschlagen userId=${state.member.id} code=${e?.code} status=${e?.status} msg=${e?.message}`,
    );
  }
}

// Zählt menschliche User im Voice-Channel anhand der voiceStates direkt
// (statt channel.members getter, der auf member-cache angewiesen ist).
function countHumansInVoice(voice: VoiceChannel): { count: number; ids: string[] } {
  const ids: string[] = [];
  for (const state of voice.guild.voiceStates.cache.values()) {
    if (state.channelId !== voice.id) continue;
    const member = state.member ?? voice.guild.members.cache.get(state.id);
    // Wenn wir den Member nicht haben, sicherheitshalber als human zählen
    // (lieber NICHT löschen als versehentlich besetzten Channel killen)
    if (member?.user?.bot === true) continue;
    ids.push(state.id);
  }
  return { count: ids.length, ids };
}

// Löscht einen Temp-Channel, wenn er leer ist und in unserer Tabelle steht.
export async function maybeDeleteTempChannel(
  client: Client,
  channelId: string,
): Promise<void> {
  const record = await prisma.tempChannel.findUnique({ where: { channelId } });
  if (!record) return;

  // Cache-first; bei Cache-Miss REST-Fetch. Bei REST-Fehler unterscheiden
  // zwischen „Channel wirklich gelöscht" (10003) und „Fetch-Fehler" — beim
  // Fehler retry später (sonst löschen wir DB-Eintrag und Discord-Channel
  // bleibt orphan-stehen).
  let channel = client.channels.cache.get(channelId) ?? null;
  if (!channel) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10003) {
        // "Unknown Channel" — wirklich gelöscht
        await prisma.tempChannel.delete({ where: { channelId } }).catch(() => {});
        logger.info({ channelId }, "TempChannel: auf Discord nicht mehr da, DB bereinigt");
      } else {
        logger.warn({ err, channelId }, "TempChannel: Fetch fehlgeschlagen, retry später");
      }
      return;
    }
    if (!channel) {
      logger.warn({ channelId }, "TempChannel: Fetch lieferte null, retry später");
      return;
    }
  }

  if (channel.type !== ChannelType.GuildVoice) {
    logger.warn({ channelId, type: channel.type }, "TempChannel: nicht Voice, DB bereinigt");
    await prisma.tempChannel.delete({ where: { channelId } }).catch(() => {});
    return;
  }

  const voice = channel as VoiceChannel;
  const { count, ids } = countHumansInVoice(voice);
  const locked = isChannelLocked(voice);

  logger.info(
    { channelId, name: voice.name, count, occupants: ids, locked },
    "TempChannel: Status-Check",
  );

  if (count > 0) return;

  // Self-Heal für ALTE Channels (vor dem Bot-Overwrite-Fix): wenn der Bot
  // keine eigene ManageChannels-Permission auf dem Channel hat, versuche
  // sie hinzuzufügen. Wenn das auch fehlschlägt (z.B. weil ViewChannel
  // gleich auf Category fehlt), läuft alles weitere natürlich auch nicht.
  const botMember = voice.guild.members.me;
  if (botMember) {
    const botOw = voice.permissionOverwrites.cache.get(botMember.id);
    if (!botOw || !botOw.allow.has(PermissionFlagsBits.ManageChannels)) {
      await voice.permissionOverwrites
        .edit(botMember.id, {
          ViewChannel: true,
          ManageChannels: true,
          ManageRoles: true,
        })
        .catch((err: unknown) => {
          const e = err as { code?: number; message?: string };
          logger.warn(
            `TempChannel Self-Heal-Permission fehlgeschlagen [${channelId}] code=${e?.code} msg=${e?.message}`,
          );
        });
    }
  }

  // Defensiv: leeren + gesperrten Channel vor dem Löschen entsperren,
  // damit er nie als „stuck-locked" hängen bleibt, falls Löschen scheitert.
  if (locked) {
    logger.info({ channelId }, "TempChannel: leer+locked → Auto-Unlock");
    await voice.permissionOverwrites
      .edit(voice.guild.roles.everyone, { Connect: null })
      .catch((err: unknown) => {
        const e = err as { code?: number; message?: string; status?: number };
        logger.warn(
          `TempChannel Auto-Unlock fehlgeschlagen [${channelId}] code=${e?.code} status=${e?.status} msg=${e?.message}`,
        );
      });
    // Nach Permission-Change kurz reprüfen — falls jemand inzwischen joinen konnte
    const recheck = countHumansInVoice(voice);
    if (recheck.count > 0) {
      logger.info(
        { channelId, occupants: recheck.ids },
        "TempChannel: nach Auto-Unlock besetzt, kein Löschen",
      );
      return;
    }
  }

  try {
    await voice.delete("Temp-Channel ist leer");
    await prisma.tempChannel.delete({ where: { channelId } });
    logger.info({ channelId, name: voice.name }, "TempChannel: GELÖSCHT ✓");
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string; status?: number };
    const hint =
      e?.code === 50013
        ? "Missing Permissions — Bot braucht 'Channels verwalten' für diese Kategorie"
        : e?.code === 50001
          ? "Missing Access — Bot sieht Channel nicht"
          : e?.code === 10003
            ? "Unknown Channel (schon weg)"
            : "unbekannter Discord-Fehler";
    logger.error(
      `TempChannel Löschung fehlgeschlagen [${channelId}] code=${e?.code} status=${e?.status} msg="${e?.message}" → ${hint}`,
    );
  }
}

// Periodischer Cleanup-Lauf — fängt Fälle ab, wo voiceStateUpdate aus
// irgendwelchen Gründen verschluckt wurde (z.B. Race nach Permission-
// Update durch Lock-Aktion).
export function startTempChannelSweeper(client: Client): void {
  const INTERVAL_MS = 30_000;
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
