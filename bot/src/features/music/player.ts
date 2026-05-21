import type { Client } from "discord.js";
import { Player } from "discord-player";
import { DefaultExtractors } from "@discord-player/extractor";
import { logger } from "../../lib/logger.js";
import { YtdlpExtractor } from "./ytdlpExtractor.js";

let _player: Player | null = null;

export async function initMusicPlayer(client: Client): Promise<void> {
  if (_player) return;
  // Cast: discord.js 14.26+ exposes ESM/CJS dual types; discord-player resolves the CJS variant.
  const player = new Player(client as never);

  // DefaultExtractors enthält u.a. Spotify-Metadata + SoundCloud + AttachmentExtractor.
  // Der eigene YtdlpExtractor (höhere Priority) übernimmt YouTube + Search + SoundCloud-Streams.
  await player.extractors.loadMulti(DefaultExtractors);
  const yt = await player.extractors.register(YtdlpExtractor, {});
  if (yt) yt.priority = 1000;

  player.events.on("playerStart", (queue, track) => {
    logger.info({ guildId: queue.guild.id, title: track.title }, "Music: Start");
  });

  player.events.on("playerFinish", (queue, track) => {
    logger.info({ guildId: queue.guild.id, title: track.title }, "Music: Finish");
  });

  player.events.on("playerSkip", (queue, track) => {
    logger.info({ guildId: queue.guild.id, title: track.title }, "Music: Skip-Event");
  });

  player.events.on("audioTrackAdd", (queue, track) => {
    logger.info({ guildId: queue.guild.id, title: track.title }, "Music: Track hinzugefügt");
  });

  player.events.on("audioTrackRemove", (queue, track) => {
    logger.info({ guildId: queue.guild.id, title: track.title }, "Music: Track entfernt");
  });

  player.events.on("disconnect", (queue) => {
    logger.info({ guildId: queue.guild.id }, "Music: Disconnect");
  });

  // Bot allein im Voice → Channel verlassen.
  player.events.on("emptyChannel", (queue) => {
    logger.info({ guildId: queue.guild.id }, "Music: Voice leer, verlasse");
    queue.delete();
  });

  player.events.on("emptyQueue", (queue) => {
    logger.info({ guildId: queue.guild.id }, "Music: Queue leer");
  });

  player.events.on("playerError", (queue, err) => {
    logger.error({ err, guildId: queue.guild.id }, "Music: Player-Error");
  });

  player.events.on("error", (queue, err) => {
    logger.error({ err, guildId: queue.guild.id }, "Music: Queue-Error");
  });

  _player = player;
  logger.info("Music-Player initialisiert");
}

export function getPlayer(): Player {
  if (!_player) throw new Error("Music-Player nicht initialisiert");
  return _player;
}
