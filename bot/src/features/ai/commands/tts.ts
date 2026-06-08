import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { runTtsJob, getRemainingQuota } from "../service.js";
import type { SlashCommand } from "../../../lib/types.js";

// MiniMax-Voices (Auswahl). Full list: https://intl.minimaxi.com/document/T2A
const VOICE_CHOICES = [
  { name: "Deutsch (M, freundlich)", value: "German_PlayfulMan" },
  { name: "Deutsch (F, ruhig)", value: "German_SweetLady" },
  { name: "Englisch (M, US)", value: "English_FriendlyMan" },
  { name: "Englisch (F, US)", value: "English_GraceLady" },
  { name: "Chinesisch (M)", value: "Chinese_Mandarin_Man" },
] as const;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("tts")
    .setDescription("Text in gesprochenes Audio umwandeln.")
    .addStringOption((o) =>
      o
        .setName("text")
        .setDescription("Der gesprochene Text (max 500 Zeichen)")
        .setRequired(true)
        .setMaxLength(500),
    )
    .addStringOption((o) =>
      o
        .setName("voice")
        .setDescription("Welche Stimme?")
        .setRequired(false)
        .addChoices(...VOICE_CHOICES),
    ),

  async execute(interaction) {
    const text = interaction.options.getString("text", true);
    const voice = interaction.options.getString("voice") ?? undefined;

    await interaction.deferReply();

    const result = await runTtsJob({
      userId: interaction.user.id,
      channelId: interaction.channelId,
      text,
      voiceId: voice,
    });

    if (!result.ok) {
      await interaction.editReply({
        content: result.userError ? `⚠️ ${result.error}` : `❌ ${result.error}`,
      });
      return;
    }

    const quota = await getRemainingQuota("tts", interaction.user.id);
    const att = new AttachmentBuilder(result.audio, { name: "tts.mp3" });

    await interaction.editReply({
      content: `🎙️ *${text.slice(0, 200)}*${text.length > 200 ? "…" : ""}\n_${quota.used}/${quota.limit} heute_`,
      files: [att],
    });
  },
};

export default command;
