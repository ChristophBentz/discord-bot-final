import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { prisma } from "@repo/db";

import { env } from "../lib/env.js";
import { signProfileToken } from "../lib/profileToken.js";
import type { SlashCommand } from "../lib/types.js";

const BASE_URL = env.PUBLIC_WEB_URL.replace(/\/+$/, "");
const BRAND_COLOR = 0xa855f7;

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

async function getProfileState(userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { profileTokenVersion: true, profilePublic: true },
  });
  const version = member?.profileTokenVersion ?? 0;
  return {
    version,
    isPublic: member?.profilePublic ?? true,
    publicUrl: `${BASE_URL}/u/${userId}`,
    editUrl: `${BASE_URL}/u/${userId}?key=${signProfileToken(userId, version)}`,
  };
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
      const state = await getProfileState(user.id);
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor({
          name: `${user.displayName ?? user.username} — Neuer Bearbeiten-Link`,
          iconURL: user.displayAvatarURL({ size: 128 }),
        })
        .setDescription(
          "🔐 Dein alter Link wurde **ungültig** gemacht.\n" +
            "Unten findest du den neuen — bewahre ihn sicher auf.",
        )
        .addFields({
          name: "✏️ Bearbeiten-Link (NEU — geheim halten)",
          value: `[${state.editUrl.replace(BASE_URL + "/", "")}](${state.editUrl})`,
        })
        .setFooter({ text: "Nur du siehst diese Nachricht." });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds,
      });
      return;
    }

    // Default: /profil oder /profil link
    const state = await getProfileState(user.id);
    const statusLine = state.isPublic
      ? "🟢  **Öffentlich** — andere können dein Profil sehen"
      : "🔒  **Privat** — Fremde sehen nur deinen Namen und Avatar";

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setAuthor({
        name: `${user.displayName ?? user.username} — Dein Profil`,
        iconURL: user.displayAvatarURL({ size: 128 }),
      })
      .setDescription(`**Sichtbarkeit**\n${statusLine}`)
      .addFields(
        {
          name: "🌐 Öffentliche Ansicht",
          value: `[${state.publicUrl.replace("https://", "").replace("http://", "")}](${state.publicUrl})`,
          inline: false,
        },
        {
          name: "✏️ Bearbeiten-Modus (geheim halten!)",
          value: `[Hier klicken zum Bearbeiten](${state.editUrl})`,
          inline: false,
        },
      )
      .setFooter({
        text: "Mit /profil reset bekommst du einen neuen Bearbeiten-Link.",
      });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds,
    });
  },
};

export default command;
