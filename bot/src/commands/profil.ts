import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { prisma } from "@repo/db";

import { env } from "../lib/env.js";
import { signProfileToken } from "../lib/profileToken.js";
import type { SlashCommand } from "../lib/types.js";

const BASE_URL = env.PUBLIC_WEB_URL.replace(/\/+$/, "");
const BRAND_COLOR = 0xa855f7;
const RESET_COLOR = 0xf59e0b;

async function ensureMember(userId: string, username: string, displayName: string) {
  await prisma.member.upsert({
    where: { userId },
    update: {},
    create: { userId, username, displayName, inServer: true },
  });
}

interface ProfileState {
  isPublic: boolean;
  publicUrl: string;
  editUrl: string;
}

async function getProfileState(userId: string): Promise<ProfileState> {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { profileTokenVersion: true, profilePublic: true },
  });
  const version = member?.profileTokenVersion ?? 0;
  return {
    isPublic: member?.profilePublic ?? true,
    publicUrl: `${BASE_URL}/u/${userId}`,
    editUrl: `${BASE_URL}/u/${userId}?key=${signProfileToken(userId, version)}`,
  };
}

function buildActionRow(state: ProfileState): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Profil ansehen")
      .setEmoji("🌐")
      .setURL(state.publicUrl),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Bearbeiten-Modus")
      .setEmoji("✏️")
      .setURL(state.editUrl),
  );
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
    const memberName = user.displayName ?? user.username;
    const avatar = user.displayAvatarURL({ size: 256, extension: "png" });

    await ensureMember(user.id, user.username, memberName);

    // ─── /profil reset ─────────────────────────────────────────────────
    if (sub === "reset") {
      await prisma.member.update({
        where: { userId: user.id },
        data: { profileTokenVersion: { increment: 1 } },
      });
      const state = await getProfileState(user.id);

      const embed = new EmbedBuilder()
        .setColor(RESET_COLOR)
        .setAuthor({ name: memberName, iconURL: avatar })
        .setTitle("🔐  Bearbeiten-Link zurückgesetzt")
        .setThumbnail(avatar)
        .setDescription(
          "Dein alter Link ist ab sofort **ungültig**.\n" +
            "Benutze unten den neuen Button um dein Profil zu bearbeiten.",
        )
        .addFields(
          {
            name: "​",
            value: "**Was bedeutet das?**",
            inline: false,
          },
          {
            name: "🛡️  Sicherheit",
            value: "Alle alten Links führen jetzt auf die öffentliche Ansicht ohne Edit-Rechte.",
            inline: false,
          },
        )
        .setFooter({ text: "Bewahre den neuen Link sicher auf — er ist dein Bearbeiten-Schlüssel." })
        .setTimestamp(new Date());

      await interaction.reply({
        embeds: [embed],
        components: [buildActionRow(state)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ─── /profil (oder /profil link) ───────────────────────────────────
    const state = await getProfileState(user.id);

    const statusEmoji = state.isPublic ? "🟢" : "🔒";
    const statusLabel = state.isPublic ? "Öffentlich sichtbar" : "Privat";
    const statusDescription = state.isPublic
      ? "Andere können dein Profil, deine Stats und Achievements sehen."
      : "Fremde sehen nur deinen Namen und Avatar.";

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setAuthor({ name: memberName, iconURL: avatar })
      .setTitle("🪪  Dein Profil")
      .setThumbnail(avatar)
      .setDescription(
        `\`\`\`${statusEmoji} ${statusLabel}\`\`\`` +
          `${statusDescription}\n​`,
      )
      .addFields(
        {
          name: "🌐  Öffentliche Ansicht",
          value:
            "Diesen Link kannst du teilen — zeigt deine Profilseite mit Level, Stats und Achievements.",
          inline: false,
        },
        {
          name: "✏️  Bearbeiten-Modus",
          value:
            "Nur du. Hier kannst du dein Profil auf **privat** oder **öffentlich** stellen.\n" +
            "_Bitte den Link niemals teilen!_",
          inline: false,
        },
        {
          name: "​",
          value:
            "💡 Bei Bedarf neuen Link erzeugen: `/profil reset`\n" +
            "_Der alte Link wird sofort ungültig._",
          inline: false,
        },
      )
      .setFooter({ text: "Bot-Dashboard · Profile" })
      .setTimestamp(new Date());

    await interaction.reply({
      embeds: [embed],
      components: [buildActionRow(state)],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
