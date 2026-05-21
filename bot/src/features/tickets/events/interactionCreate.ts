import { Events, MessageFlags } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { openTicket } from "../service.js";

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "ticket:open") return;
    if (!interaction.member || !interaction.guild) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const res = await openTicket(member);

    if (res.ok) {
      await interaction.editReply(`✅ Ticket geöffnet: <#${res.threadId}>`);
    } else {
      await interaction.editReply(`❌ ${res.error}`);
    }
  },
};

export default event;
