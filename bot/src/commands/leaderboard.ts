import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { env } from "../lib/env.js";
import type { SlashCommand } from "../lib/types.js";

const BASE_URL = env.PUBLIC_WEB_URL.replace(/\/+$/, "");
const LEADERBOARD_URL = `${BASE_URL}/leaderboard`;
const BRAND_COLOR = 0xa855f7;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Zeigt den Link zum öffentlichen Server-Leaderboard."),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle("🏆  Server-Leaderboard")
      .setDescription(
        "Die aktivsten Mitglieder, sortiert nach gesammelten XP aus Chat und Voice.\n\n" +
          `\`\`\`${LEADERBOARD_URL}\`\`\``,
      )
      .setFooter({
        text: "Mitglieder mit privatem Profil sind nicht gelistet. Mit /profil änderbar.",
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Leaderboard öffnen")
        .setEmoji("🏆")
        .setURL(LEADERBOARD_URL),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
