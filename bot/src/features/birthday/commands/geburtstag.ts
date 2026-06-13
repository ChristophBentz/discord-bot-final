import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { prisma } from "@repo/db";
import type { SlashCommand } from "../../../lib/types.js";
import { buildBirthdayPanel, loadBirthday } from "../ui.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("geburtstag")
    .setDescription("Geburtstag festlegen und verwalten."),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Member-Datensatz sicherstellen (falls Sync noch nicht durch).
    await prisma.member.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        username: interaction.user.username,
        displayName: interaction.user.displayName ?? interaction.user.username,
        inServer: true,
      },
    });

    const rec = await loadBirthday(userId);
    const panel = buildBirthdayPanel(rec);
    await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
  },
};

export default command;
