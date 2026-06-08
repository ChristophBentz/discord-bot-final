import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { runChatJob, getRemainingQuota } from "../service.js";
import type { SlashCommand } from "../../../lib/types.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Stelle der KI eine Frage.")
    .addStringOption((o) =>
      o
        .setName("prompt")
        .setDescription("Deine Frage")
        .setRequired(true)
        .setMaxLength(2000),
    ),

  async execute(interaction) {
    const prompt = interaction.options.getString("prompt", true);
    await interaction.deferReply();

    const result = await runChatJob({
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

    const quota = await getRemainingQuota("chat", interaction.user.id);

    // Wenn Antwort kurz: in Embed-Description (max 4096 chars)
    // Wenn lang: kürzen mit Hinweis
    const text = result.text.slice(0, 4000);
    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setAuthor({
        name: interaction.user.displayName ?? interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ size: 64 }),
      })
      .setDescription(`> ${prompt.slice(0, 200)}\n\n${text}`)
      .setFooter({ text: `${quota.used}/${quota.limit} heute` })
      .setTimestamp(new Date());

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
