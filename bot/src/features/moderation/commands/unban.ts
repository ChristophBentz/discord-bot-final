import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../../lib/types.js";
import { handleUnban } from "../../../api/routes/moderation.js";
import { canUseModCommands, NO_COMMAND_ACCESS_MESSAGE } from "../access.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Hebt einen Ban auf.")
    .addStringOption((o) =>
      o
        .setName("user_id")
        .setDescription("Discord-ID des gebannten Users (User ist nicht mehr im Server)")
        .setRequired(true),
    )
    .addStringOption((o) => o.setName("grund").setDescription("Grund (optional)"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await canUseModCommands(interaction.user.id))) {
      await interaction.editReply(NO_COMMAND_ACCESS_MESSAGE);
      return;
    }
    const userId = interaction.options.getString("user_id", true).trim();
    const reason = interaction.options.getString("grund") ?? "";

    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.editReply("❌ Ungültige User-ID (17–20 Ziffern erwartet).");
      return;
    }

    const res = await handleUnban(interaction.client, userId, {
      reason,
      moderatorId: interaction.user.id,
      moderatorName: interaction.user.username,
    });

    if (res.ok) await interaction.editReply(`✅ Ban für \`${userId}\` aufgehoben.`);
    else await interaction.editReply(`❌ ${res.error}`);
  },
};

export default command;
