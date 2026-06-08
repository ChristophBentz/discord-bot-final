import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { runMusicJob, getRemainingQuota } from "../service.js";
import type { SlashCommand } from "../../../lib/types.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Generiere Musik aus einem Prompt.")
    .addStringOption((o) =>
      o
        .setName("prompt")
        .setDescription("Stil + ggf. Lyrics, z.B. 'Lo-fi hip-hop chill beats'")
        .setRequired(true)
        .setMaxLength(600),
    ),

  async execute(interaction) {
    const prompt = interaction.options.getString("prompt", true);
    await interaction.deferReply();

    const result = await runMusicJob({
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

    const quota = await getRemainingQuota("music", interaction.user.id);
    const att = new AttachmentBuilder(result.audio, { name: "music.mp3" });

    await interaction.editReply({
      content: `🎵 *${prompt.slice(0, 200)}*\n_${quota.used}/${quota.limit} heute_`,
      files: [att],
    });
  },
};

export default command;
