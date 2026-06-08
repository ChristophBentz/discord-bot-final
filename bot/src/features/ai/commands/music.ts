import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { runMusicJob, getRemainingQuota } from "../service.js";
import type { SlashCommand } from "../../../lib/types.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Generiere Musik mit Lyrics (MiniMax erwartet richtige Songtexte).")
    .addStringOption((o) =>
      o
        .setName("lyrics")
        .setDescription("Songtext (min. ~10 Wörter). Englisch funktioniert oft besser.")
        .setRequired(true)
        .setMinLength(20)
        .setMaxLength(600),
    ),

  async execute(interaction) {
    const lyrics = interaction.options.getString("lyrics", true);
    await interaction.deferReply();

    const result = await runMusicJob({
      userId: interaction.user.id,
      channelId: interaction.channelId,
      prompt: lyrics,
    });

    if (!result.ok) {
      // Spezifischer Hinweis bei Code 2013 (lyrics too short)
      let hint = result.error;
      if (/2013|too short|invalid params/i.test(result.error)) {
        hint =
          "Lyrics zu kurz oder ungültig. Beispiel:\n" +
          "`[Verse 1]\nWalking down the empty street tonight\n" +
          "City lights are shining oh so bright\n[Chorus]\nThis is freedom, this is fly`";
      }
      await interaction.editReply({
        content: result.userError ? `⚠️ ${hint}` : `❌ ${hint}`,
      });
      return;
    }

    const quota = await getRemainingQuota("music", interaction.user.id);
    const att = new AttachmentBuilder(result.audio, { name: "music.mp3" });

    await interaction.editReply({
      content: `🎵 *${lyrics.slice(0, 200)}*\n_${quota.used}/${quota.limit} heute_`,
      files: [att],
    });
  },
};

export default command;
