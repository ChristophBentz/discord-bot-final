import { SlashCommandBuilder } from "discord.js";
import { QueueRepeatMode, useQueue } from "discord-player";
import type { SlashCommand } from "../../../lib/types.js";
import { musicGuard } from "../guard.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Loop-Modus setzen.")
    .addStringOption((o) =>
      o
        .setName("mode")
        .setDescription("Modus")
        .setRequired(true)
        .addChoices(
          { name: "Aus", value: "off" },
          { name: "Track wiederholen", value: "track" },
          { name: "Queue wiederholen", value: "queue" },
        ),
    ),

  async execute(interaction) {
    const guard = await musicGuard(interaction);
    if (!guard.ok) return;
    const queue = useQueue(interaction.guild!.id);
    if (!queue) {
      await interaction.reply({ content: "Nichts läuft gerade.", ephemeral: true });
      return;
    }
    const mode = interaction.options.getString("mode", true) as "off" | "track" | "queue";
    const map = {
      off: QueueRepeatMode.OFF,
      track: QueueRepeatMode.TRACK,
      queue: QueueRepeatMode.QUEUE,
    } as const;
    queue.setRepeatMode(map[mode]);
    const label = mode === "off" ? "Aus" : mode === "track" ? "Track" : "Queue";
    await interaction.reply(`🔁 Loop: **${label}**`);
  },
};

export default command;
