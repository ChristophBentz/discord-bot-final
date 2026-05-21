import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { QueryType } from "discord-player";
import type { SlashCommand } from "../../../lib/types.js";
import { getPlayer } from "../player.js";
import { musicGuard } from "../guard.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Spielt Musik (YouTube/Spotify/SoundCloud — URL oder Suchbegriff).")
    .addStringOption((o) =>
      o
        .setName("query")
        .setDescription("Link oder Suchbegriff")
        .setRequired(true),
    ),

  async execute(interaction) {
    const guard = await musicGuard(interaction, { requireVoice: true });
    if (!guard.ok) return;

    await interaction.deferReply();
    const query = interaction.options.getString("query", true);
    const player = getPlayer();
    const voiceChannel = guard.member.voice.channel!;

    try {
      const result = await player.play(voiceChannel as never, query, {
        searchEngine: QueryType.AUTO,
        nodeOptions: {
          metadata: { channel: interaction.channel },
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 60_000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 5 * 60_000,
          selfDeaf: false,
          volume: 80,
        },
        requestedBy: interaction.user as never,
      });
      const t = result.track;
      const queued = result.queue.tracks.size > 0;
      await interaction.editReply(
        queued
          ? `🎵 **${t.title}** zur Queue (#${result.queue.tracks.size}) hinzugefügt.`
          : `🎵 Spiele jetzt: **${t.title}** · ${t.duration}`,
      );
    } catch (err) {
      await interaction.editReply({
        content: `❌ Konnte nicht abspielen: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },
};

export default command;
