import { SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import type { SlashCommand } from "../../../lib/types.js";
import { musicGuard } from "../guard.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("resume").setDescription("Setzt die Wiedergabe fort."),

  async execute(interaction) {
    const guard = await musicGuard(interaction);
    if (!guard.ok) return;
    const queue = useQueue(interaction.guild!.id);
    if (!queue?.currentTrack) {
      await interaction.reply({ content: "Nichts läuft gerade.", ephemeral: true });
      return;
    }
    queue.node.setPaused(false);
    await interaction.reply("▶️ Weiter.");
  },
};

export default command;
