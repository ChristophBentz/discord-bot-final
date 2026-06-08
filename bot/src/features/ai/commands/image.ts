import {
  AttachmentBuilder,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { getConfig } from "@repo/db";

import { runImageJob, getRemainingQuota } from "../service.js";
import type { SlashCommand } from "../../../lib/types.js";

const ASPECT_CHOICES = [
  { name: "Quadrat (1:1)", value: "1:1" },
  { name: "Querformat (16:9)", value: "16:9" },
  { name: "Hochformat (9:16)", value: "9:16" },
  { name: "Foto (4:3)", value: "4:3" },
  { name: "Portrait (3:4)", value: "3:4" },
] as const;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("image")
    .setDescription("Generiere ein Bild mit KI.")
    .addStringOption((opt) =>
      opt
        .setName("prompt")
        .setDescription("Was soll auf dem Bild zu sehen sein? (Englisch funktioniert oft besser)")
        .setRequired(true)
        .setMaxLength(1000),
    )
    .addStringOption((opt) =>
      opt
        .setName("aspect")
        .setDescription("Seitenverhältnis (default: 1:1)")
        .setRequired(false)
        .addChoices(...ASPECT_CHOICES),
    ),

  async execute(interaction) {
    const config = await getConfig();

    if (!config.aiEnabled) {
      await interaction.reply({
        content: "🚫 AI-Features sind aktuell deaktiviert.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Channel-Restriction
    if (
      config.aiImageChannelId &&
      interaction.channelId !== config.aiImageChannelId
    ) {
      await interaction.reply({
        content: `🚫 Bitte nutze \`/image\` nur in <#${config.aiImageChannelId}>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const prompt = interaction.options.getString("prompt", true);
    const aspect =
      (interaction.options.getString("aspect") as
        | "1:1"
        | "16:9"
        | "9:16"
        | "4:3"
        | "3:4"
        | null) ?? "1:1";

    // Defer — Bildgenerierung dauert
    await interaction.deferReply();

    const result = await runImageJob({
      userId: interaction.user.id,
      prompt,
      aspectRatio: aspect,
    });

    if (!result.ok) {
      await interaction.editReply({
        content: result.userError ? `⚠️ ${result.error}` : `❌ ${result.error}`,
      });
      return;
    }

    const quota = await getRemainingQuota(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setAuthor({
        name: interaction.user.displayName ?? interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ size: 64 }),
      })
      .setTitle(prompt.slice(0, 256))
      .setFooter({
        text: `${aspect} · ${quota.used}/${quota.limit} heute · MiniMax`,
      })
      .setTimestamp(new Date());

    if (result.buffer) {
      const att = new AttachmentBuilder(result.buffer, {
        name: `image.png`,
      });
      embed.setImage(`attachment://image.png`);
      await interaction.editReply({ embeds: [embed], files: [att] });
    } else {
      embed.setImage(result.imageUrl);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default command;
