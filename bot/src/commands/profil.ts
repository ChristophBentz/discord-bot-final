import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { prisma } from "@repo/db";

import { env } from "../lib/env.js";
import { signProfileToken } from "../lib/profileToken.js";
import type { SlashCommand } from "../lib/types.js";

const BASE_URL = env.PUBLIC_WEB_URL.replace(/\/+$/, "");

async function ensureMember(userId: string, username: string, displayName: string) {
  await prisma.member.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      username,
      displayName,
      inServer: true,
    },
  });
}

async function buildLink(userId: string): Promise<string> {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { profileTokenVersion: true },
  });
  const version = member?.profileTokenVersion ?? 0;
  const token = signProfileToken(userId, version);
  return `${BASE_URL}/u/${userId}?key=${token}`;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("profil")
    .setDescription("Verwalte deine öffentliche Profilseite.")
    .addSubcommand((sub) =>
      sub.setName("link").setDescription("Zeigt deinen persönlichen Bearbeitungs-Link."),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription("Erzeugt einen neuen Link — alte Links werden ungültig."),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.user;

    await ensureMember(user.id, user.username, user.displayName ?? user.username);

    if (sub === "reset") {
      await prisma.member.update({
        where: { userId: user.id },
        data: { profileTokenVersion: { increment: 1 } },
      });
      const link = await buildLink(user.id);
      await interaction.reply({
        content:
          `🔐 Dein alter Link ist jetzt ungültig.\n` +
          `Hier ist dein neuer Bearbeitungs-Link (nur du siehst diese Nachricht):\n${link}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Default: link
    const link = await buildLink(user.id);
    const profileUrl = `${BASE_URL}/u/${user.id}`;
    await interaction.reply({
      content:
        `🪪 **Dein Profil**\n` +
        `Öffentliche Ansicht: ${profileUrl}\n` +
        `Mit Bearbeiten-Modus (privat halten!): ${link}\n\n` +
        `Über den Bearbeiten-Link kannst du dein Profil auf privat oder öffentlich stellen. ` +
        `Falls du ihn versehentlich teilst, kannst du mit \`/profil reset\` einen neuen erzeugen.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
