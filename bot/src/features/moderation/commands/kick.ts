import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../../lib/types.js";
import { handleKick } from "../../../api/routes/moderation.js";
import { canUseModCommands, NO_COMMAND_ACCESS_MESSAGE } from "../access.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kickt einen User vom Server.")
    .addUserOption((o) => o.setName("user").setDescription("Wer").setRequired(true))
    .addStringOption((o) => o.setName("grund").setDescription("Warum").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await canUseModCommands(interaction.user.id))) {
      await interaction.editReply(NO_COMMAND_ACCESS_MESSAGE);
      return;
    }
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("grund", true);

    const res = await handleKick(interaction.client, user.id, {
      reason,
      moderatorId: interaction.user.id,
      moderatorName: interaction.user.username,
    });

    if (res.ok) {
      const dm = res.dmSent ? "DM zugestellt" : `DM fehlgeschlagen (${res.dmError ?? "?"})`;
      await interaction.editReply(`✅ ${user.username} gekickt · ${dm}`);
    } else {
      await interaction.editReply(`❌ ${res.error}`);
    }
  },
};

export default command;
