import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import type { SlashCommand } from "../../../lib/types.js";
import { musicGuard } from "../guard.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Zeigt die aktuelle Queue."),

  async execute(interaction) {
    const guard = await musicGuard(interaction);
    if (!guard.ok) return;

    const queue = useQueue(interaction.guild!.id);
    if (!queue?.currentTrack) {
      await interaction.reply({ content: "Queue ist leer.", ephemeral: true });
      return;
    }

    const current = queue.currentTrack;
    const upcoming = queue.tracks.toArray().slice(0, 10);
    const lines = upcoming
      .map((t, i) => `**${i + 1}.** ${t.title} · ${t.duration}`)
      .join("\n");
    const more = queue.tracks.size > 10 ? `\n…und ${queue.tracks.size - 10} weitere` : "";

    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setTitle("🎵 Queue")
      .addFields(
        { name: "Jetzt", value: `**${current.title}** · ${current.duration}` },
        ...(upcoming.length > 0
          ? [{ name: `Als nächstes (${queue.tracks.size})`, value: lines + more }]
          : []),
      );
    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
