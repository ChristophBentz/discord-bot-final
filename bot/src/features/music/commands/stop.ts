import { SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import type { SlashCommand } from "../../../lib/types.js";
import { musicGuard } from "../guard.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stoppt die Wiedergabe und leert die Queue."),

  async execute(interaction) {
    const guard = await musicGuard(interaction);
    if (!guard.ok) return;
    const queue = useQueue(interaction.guild!.id);
    if (!queue) {
      await interaction.reply({ content: "Nichts läuft gerade.", ephemeral: true });
      return;
    }
    queue.delete();
    await interaction.reply("⏹️ Gestoppt und Queue geleert.");
  },
};

export default command;
