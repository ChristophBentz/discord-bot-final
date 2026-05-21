import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../lib/types.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Antwortet mit Pong."),
  async execute(interaction) {
    const sent = await interaction.reply({ content: "Pinge...", fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(
      `Pong! Latenz: ${latency} ms — WebSocket: ${interaction.client.ws.ping} ms.`,
    );
  },
};

export default command;
