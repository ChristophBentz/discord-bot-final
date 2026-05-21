import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../../lib/types.js";
import { handleWarn } from "../../../api/routes/warn.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Verwarnt einen User mit Grund.")
    .addUserOption((o) => o.setName("user").setDescription("Wer").setRequired(true))
    .addStringOption((o) => o.setName("grund").setDescription("Warum").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("grund", true);

    const res = await handleWarn(interaction.client, user.id, {
      reason,
      moderatorId: interaction.user.id,
      moderatorName: interaction.user.username,
    });

    if (res.ok) {
      const dm = res.dmSent ? "DM zugestellt" : `DM fehlgeschlagen (${res.dmError ?? "?"})`;
      await interaction.editReply(`✅ ${user.username} verwarnt · ${dm}`);
    } else {
      await interaction.editReply(`❌ ${res.error}`);
    }
  },
};

export default command;
