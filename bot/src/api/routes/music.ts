import type { Client } from "discord.js";
import { ChannelType } from "discord.js";
import { QueryType, QueueRepeatMode, useQueue } from "discord-player";
import { env } from "../../lib/env.js";
import { getPlayer } from "../../features/music/player.js";
import { memberCanControlMusic } from "../../features/music/service.js";

export interface MusicState {
  enabled: boolean;
  voiceChannel: { id: string; name: string } | null;
  current: {
    title: string;
    author: string;
    url: string;
    thumbnail: string;
    durationMs: number;
    progressMs: number;
    requestedBy: string | null;
  } | null;
  paused: boolean;
  repeatMode: "off" | "track" | "queue" | "autoplay";
  volume: number;
  upcoming: Array<{
    title: string;
    author: string;
    durationMs: number;
    requestedBy: string | null;
  }>;
  totalQueueSize: number;
}

export async function getMusicState(client: Client): Promise<MusicState> {
  const guildId = env.DISCORD_GUILD_ID;
  const queue = useQueue(guildId);
  const enabled = true;
  if (!queue || !queue.currentTrack) {
    return {
      enabled,
      voiceChannel: null,
      current: null,
      paused: false,
      repeatMode: "off",
      volume: 80,
      upcoming: [],
      totalQueueSize: 0,
    };
  }
  const me = queue.guild.members.me;
  const vc = me?.voice.channel;
  const repeat: MusicState["repeatMode"] =
    queue.repeatMode === QueueRepeatMode.TRACK
      ? "track"
      : queue.repeatMode === QueueRepeatMode.QUEUE
        ? "queue"
        : queue.repeatMode === QueueRepeatMode.AUTOPLAY
          ? "autoplay"
          : "off";
  const t = queue.currentTrack;
  const upcoming = queue.tracks
    .toArray()
    .slice(0, 25)
    .map((tr) => ({
      title: tr.title,
      author: tr.author,
      durationMs: tr.durationMS,
      requestedBy: tr.requestedBy?.username ?? null,
    }));
  return {
    enabled,
    voiceChannel: vc ? { id: vc.id, name: vc.name } : null,
    current: {
      title: t.title,
      author: t.author,
      url: t.url,
      thumbnail: t.thumbnail,
      durationMs: t.durationMS,
      progressMs: queue.node.streamTime,
      requestedBy: t.requestedBy?.username ?? null,
    },
    paused: queue.node.isPaused(),
    repeatMode: repeat,
    volume: queue.node.volume,
    upcoming,
    totalQueueSize: queue.tracks.size,
  };
  void client;
}

export interface PlayBody {
  query?: string;
  userId?: string;
}

export async function handlePlay(
  client: Client,
  body: PlayBody,
): Promise<{ ok: true; track: string; queued: boolean } | { ok: false; error: string }> {
  const query = (body.query ?? "").trim();
  const userId = body.userId ?? "";
  if (!query) return { ok: false, error: "Query fehlt." };
  if (!/^\d{17,20}$/.test(userId)) return { ok: false, error: "User-ID fehlt." };

  const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return { ok: false, error: "Du bist nicht auf dem Server." };

  if (!(await memberCanControlMusic(member))) {
    return { ok: false, error: "Du hast keine DJ-Rolle." };
  }

  const voiceChannel = member.voice.channel;
  if (!voiceChannel) return { ok: false, error: "Du musst in einem Voice-Channel sein." };
  if (voiceChannel.type !== ChannelType.GuildVoice && voiceChannel.type !== ChannelType.GuildStageVoice) {
    return { ok: false, error: "Voice-Channel-Typ wird nicht unterstützt." };
  }

  const player = getPlayer();
  try {
    const result = await player.play(voiceChannel as never, query, {
      searchEngine: QueryType.AUTO,
      nodeOptions: {
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 60_000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 5 * 60_000,
        selfDeaf: false,
        volume: 80,
      },
      requestedBy: member.user as never,
    });
    return { ok: true, track: result.track.title, queued: result.queue.tracks.size > 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface ActionBody {
  userId?: string;
}

async function authorize(
  client: Client,
  userId: string | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!userId || !/^\d{17,20}$/.test(userId)) return { ok: false, error: "User-ID fehlt." };
  const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return { ok: false, error: "Du bist nicht auf dem Server." };
  if (!(await memberCanControlMusic(member))) return { ok: false, error: "Du hast keine DJ-Rolle." };
  return { ok: true };
}

export async function handleSkip(
  client: Client,
  body: ActionBody,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await authorize(client, body.userId);
  if (!auth.ok) return auth;
  const queue = useQueue(env.DISCORD_GUILD_ID);
  if (!queue?.currentTrack) return { ok: false, error: "Nichts läuft gerade." };
  const queuedCount = queue.tracks.size;
  const result = queue.node.skip();
  return result
    ? { ok: true }
    : { ok: false, error: `Skip fehlgeschlagen (queueGröße: ${queuedCount}).` };
}

export async function handlePause(
  client: Client,
  body: ActionBody,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await authorize(client, body.userId);
  if (!auth.ok) return auth;
  const queue = useQueue(env.DISCORD_GUILD_ID);
  if (!queue?.currentTrack) return { ok: false, error: "Nichts läuft gerade." };
  queue.node.setPaused(true);
  return { ok: true };
}

export async function handleResume(
  client: Client,
  body: ActionBody,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await authorize(client, body.userId);
  if (!auth.ok) return auth;
  const queue = useQueue(env.DISCORD_GUILD_ID);
  if (!queue?.currentTrack) return { ok: false, error: "Nichts läuft gerade." };
  queue.node.setPaused(false);
  return { ok: true };
}

export async function handleStop(
  client: Client,
  body: ActionBody,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await authorize(client, body.userId);
  if (!auth.ok) return auth;
  const queue = useQueue(env.DISCORD_GUILD_ID);
  if (!queue) return { ok: false, error: "Nichts läuft gerade." };
  queue.delete();
  return { ok: true };
}

export interface VolumeBody extends ActionBody {
  percent?: number;
}

export async function handleVolume(
  client: Client,
  body: VolumeBody,
): Promise<{ ok: true; volume: number } | { ok: false; error: string }> {
  const auth = await authorize(client, body.userId);
  if (!auth.ok) return auth;
  const queue = useQueue(env.DISCORD_GUILD_ID);
  if (!queue) return { ok: false, error: "Nichts läuft gerade." };
  const raw = Number(body.percent);
  if (!Number.isFinite(raw)) return { ok: false, error: "percent muss eine Zahl sein." };
  const percent = Math.max(0, Math.min(200, Math.floor(raw)));
  queue.node.setVolume(percent);
  return { ok: true, volume: percent };
}
