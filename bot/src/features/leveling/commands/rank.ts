import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../lib/types.js";
import { getRank, progressFromXp } from "../service.js";

function progressBar(current: number, total: number, width = 20): string {
  const ratio = total > 0 ? Math.min(1, current / total) : 0;
  const filled = Math.round(ratio * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

function formatVoiceTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Zeigt deinen aktuellen Rang.")
    .addUserOption((opt) => opt.setName("user").setDescription("Anderer User (optional)")),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const { rank, total, user } = await getRank(target.id);

    if (!user) {
      await interaction.reply({
        content: `${target.username} hat noch keine XP gesammelt.`,
        ephemeral: true,
      });
      return;
    }

    const { level, xpInLevel, xpToNext } = progressFromXp(user.xp);

    const embed = new EmbedBuilder()
      .setColor(0x0071e3)
      .setAuthor({
        name: user.displayName ?? target.username,
        iconURL: target.displayAvatarURL({ size: 64 }),
      })
      .addFields(
        { name: "Level", value: `**${level}**`, inline: true },
        { name: "XP gesamt", value: user.xp.toLocaleString("de-DE"), inline: true },
        { name: "Rang", value: `#${rank} von ${total}`, inline: true },
        { name: "Nachrichten", value: user.messageCount.toLocaleString("de-DE"), inline: true },
        { name: "Voice-Zeit", value: formatVoiceTime(user.voiceSeconds), inline: true },
        { name: "​", value: "​", inline: true },
        {
          name: "Fortschritt zum nächsten Level",
          value: `\`${progressBar(xpInLevel, xpToNext)}\`\n${xpInLevel.toLocaleString("de-DE")} / ${xpToNext.toLocaleString("de-DE")} XP`,
        },
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
