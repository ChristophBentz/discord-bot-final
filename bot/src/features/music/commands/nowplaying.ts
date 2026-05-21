import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import type { SlashCommand } from "../../../lib/types.js";
import { musicGuard } from "../guard.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Zeigt den gerade laufenden Track."),

  async execute(interaction) {
    const guard = await musicGuard(interaction);
    if (!guard.ok) return;

    const queue = useQueue(interaction.guild!.id);
    const track = queue?.currentTrack;
    if (!track) {
      await interaction.reply({ content: "Nichts läuft gerade.", ephemeral: true });
      return;
    }

    const progress = queue.node.createProgressBar({ length: 14 }) ?? "";
    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setTitle("🎵 Now Playing")
      .setDescription(`**${track.title}**\n${track.author}`)
      .setThumbnail(track.thumbnail)
      .addFields({ name: "Fortschritt", value: progress || track.duration });
    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
