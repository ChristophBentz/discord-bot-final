import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../../lib/types.js";
import { handleTimeout, handleRemoveTimeout } from "../../../api/routes/moderation.js";
import { canUseModCommands, NO_COMMAND_ACCESS_MESSAGE } from "../access.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Schaltet einen User für eine bestimmte Zeit stumm.")
    .addUserOption((o) => o.setName("user").setDescription("Wer").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("dauer")
        .setDescription("Wie lange")
        .setRequired(true)
        .addChoices(
          { name: "5 Minuten", value: "300" },
          { name: "10 Minuten", value: "600" },
          { name: "30 Minuten", value: "1800" },
          { name: "1 Stunde", value: "3600" },
          { name: "6 Stunden", value: "21600" },
          { name: "1 Tag", value: "86400" },
          { name: "3 Tage", value: "259200" },
          { name: "1 Woche", value: "604800" },
          { name: "28 Tage", value: "2419200" },
          { name: "Aufheben", value: "0" },
        ),
    )
    .addStringOption((o) => o.setName("grund").setDescription("Warum").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await canUseModCommands(interaction.user.id))) {
      await interaction.editReply(NO_COMMAND_ACCESS_MESSAGE);
      return;
    }
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("grund", true);
    const duration = Number(interaction.options.getString("dauer", true));

    const body = {
      reason,
      moderatorId: interaction.user.id,
      moderatorName: interaction.user.username,
    };

    const res =
      duration === 0
        ? await handleRemoveTimeout(interaction.client, user.id, body)
        : await handleTimeout(interaction.client, user.id, { ...body, durationSeconds: duration });

    if (res.ok) {
      const dmInfo = res.dmSent
        ? "DM zugestellt"
        : res.dmError
          ? `DM: ${res.dmError}`
          : "ohne DM";
      const action = duration === 0 ? "Timeout aufgehoben" : "Timeout gesetzt";
      await interaction.editReply(`✅ ${action} für ${user.username} · ${dmInfo}`);
    } else {
      await interaction.editReply(`❌ ${res.error}`);
    }
  },
};

export default command;
