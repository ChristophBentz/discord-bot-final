import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../../lib/types.js";
import { handleBan } from "../../../api/routes/moderation.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannt einen User dauerhaft.")
    .addUserOption((o) => o.setName("user").setDescription("Wer").setRequired(true))
    .addStringOption((o) => o.setName("grund").setDescription("Warum").setRequired(true))
    .addIntegerOption((o) =>
      o
        .setName("lösch_tage")
        .setDescription("Wie viele Tage Nachrichten gelöscht werden (0–7).")
        .setMinValue(0)
        .setMaxValue(7),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("grund", true);
    const deleteDays = interaction.options.getInteger("lösch_tage") ?? 0;

    const res = await handleBan(interaction.client, user.id, {
      reason,
      deleteMessageDays: deleteDays,
      moderatorId: interaction.user.id,
      moderatorName: interaction.user.username,
    });

    if (res.ok) {
      const dm = res.dmSent ? "DM zugestellt" : `DM fehlgeschlagen (${res.dmError ?? "?"})`;
      await interaction.editReply(`✅ ${user.username} gebannt · ${dm}`);
    } else {
      await interaction.editReply(`❌ ${res.error}`);
    }
  },
};

export default command;
