import { SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import type { SlashCommand } from "../../../lib/types.js";
import { musicGuard } from "../guard.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Lautstärke setzen (0–200).")
    .addIntegerOption((o) =>
      o
        .setName("percent")
        .setDescription("0 = stumm, 100 = normal, 200 = max")
        .setMinValue(0)
        .setMaxValue(200)
        .setRequired(true),
    ),

  async execute(interaction) {
    const guard = await musicGuard(interaction);
    if (!guard.ok) return;
    const queue = useQueue(interaction.guild!.id);
    if (!queue) {
      await interaction.reply({ content: "Nichts läuft gerade.", ephemeral: true });
      return;
    }
    const percent = interaction.options.getInteger("percent", true);
    queue.node.setVolume(percent);
    await interaction.reply(`🔊 Lautstärke: **${percent}%**`);
  },
};

export default command;
