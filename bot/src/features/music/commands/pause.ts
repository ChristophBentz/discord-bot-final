import { SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import type { SlashCommand } from "../../../lib/types.js";
import { musicGuard } from "../guard.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Pausiert die Wiedergabe."),

  async execute(interaction) {
    const guard = await musicGuard(interaction);
    if (!guard.ok) return;
    const queue = useQueue(interaction.guild!.id);
    if (!queue?.currentTrack) {
      await interaction.reply({ content: "Nichts läuft gerade.", ephemeral: true });
      return;
    }
    queue.node.setPaused(true);
    await interaction.reply("⏸️ Pausiert.");
  },
};

export default command;
