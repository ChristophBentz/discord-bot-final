import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { runVideoJob, getRemainingQuota } from "../service.js";
import type { SlashCommand } from "../../../lib/types.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("video")
    .setDescription("Generiere ein kurzes Video (~6 Sek) — dauert 1-3 Min.")
    .addStringOption((o) =>
      o
        .setName("prompt")
        .setDescription("Was soll im Video passieren? (Englisch funktioniert oft besser)")
        .setRequired(true)
        .setMaxLength(1500),
    ),

  async execute(interaction) {
    const prompt = interaction.options.getString("prompt", true);
    await interaction.deferReply();
    await interaction.editReply({
      content: `⏳ **Video wird generiert…** das dauert 1-3 Minuten.\n> ${prompt.slice(0, 200)}`,
    });

    const result = await runVideoJob({
      userId: interaction.user.id,
      channelId: interaction.channelId,
      prompt,
    });

    if (!result.ok) {
      await interaction.editReply({
        content: result.userError ? `⚠️ ${result.error}` : `❌ ${result.error}`,
      });
      return;
    }

    const quota = await getRemainingQuota("video", interaction.user.id);
    const header = `🎬 *${prompt.slice(0, 200)}*\n_${quota.used}/${quota.limit} heute_`;

    if (result.video) {
      const att = new AttachmentBuilder(result.video, { name: "video.mp4" });
      await interaction.editReply({ content: header, files: [att] });
    } else {
      // Fallback: nur URL (Buffer-Download fehlgeschlagen)
      await interaction.editReply({ content: `${header}\n${result.videoUrl}` });
    }
  },
};

export default command;
