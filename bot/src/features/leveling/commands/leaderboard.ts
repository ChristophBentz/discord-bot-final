import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../lib/types.js";
import { getLeaderboard, progressFromXp } from "../service.js";

const MEDALS = ["🥇", "🥈", "🥉"];

function formatVoiceTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Zeigt die Top 10 nach XP."),

  async execute(interaction) {
    const top = await getLeaderboard(10);

    if (top.length === 0) {
      await interaction.reply({ content: "Noch keine XP gesammelt.", ephemeral: true });
      return;
    }

    const lines = top.map((user, i) => {
      const place = i < 3 ? MEDALS[i] : `\`#${i + 1}\``;
      const { level } = progressFromXp(user.xp);
      const name = user.displayName ?? `<@${user.userId}>`;
      const stats = `Lvl **${level}** · ${user.xp.toLocaleString("de-DE")} XP · ${user.messageCount.toLocaleString("de-DE")} Msg · ${formatVoiceTime(user.voiceSeconds)} Voice`;
      return `${place} **${name}**\n${stats}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x0071e3)
      .setTitle("🏆 Leaderboard")
      .setDescription(lines.join("\n\n"))
      .setFooter({ text: `${top.length} User` });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
