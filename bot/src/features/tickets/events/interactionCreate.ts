import {
  ActionRowBuilder,
  Events,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { handleRatingButton, handleRatingModal, openTicket } from "../service.js";

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isButton()) {
      if (interaction.customId === "ticket:open") {
        await openTicketInteraction(interaction);
        return;
      }
      const rateMatch = interaction.customId.match(/^ticket:rate:(\d+):([1-5])$/);
      if (rateMatch) {
        const ticketId = Number(rateMatch[1]!);
        const stars = Number(rateMatch[2]!);
        await openRatingModal(interaction, ticketId, stars);
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      const modalMatch = interaction.customId.match(/^ticket:ratemodal:(\d+):([1-5])$/);
      if (modalMatch) {
        const ticketId = Number(modalMatch[1]!);
        const stars = Number(modalMatch[2]!);
        await submitRating(interaction, ticketId, stars);
        return;
      }
    }
  },
};

async function openTicketInteraction(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.member || !interaction.guild) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const res = await openTicket(member);
  if (res.ok) {
    await interaction.editReply(`✅ Ticket geöffnet: <#${res.threadId}>`);
  } else {
    await interaction.editReply(`❌ ${res.error}`);
  }
}

async function openRatingModal(
  interaction: ButtonInteraction,
  ticketId: number,
  stars: number,
): Promise<void> {
  // Schnell-Check: ist das überhaupt der Ticket-Owner?
  const valid = await handleRatingButton(ticketId, interaction.user.id);
  if (!valid.ok) {
    await interaction.reply({ content: `❌ ${valid.error}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket:ratemodal:${ticketId}:${stars}`)
    .setTitle(`${"⭐".repeat(stars)} Bewertung abschicken`);
  const commentInput = new TextInputBuilder()
    .setCustomId("comment")
    .setLabel("Kommentar (optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder("Was lief gut? Was könnten wir besser machen?");
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(commentInput),
  );
  await interaction.showModal(modal);
}

async function submitRating(
  interaction: ModalSubmitInteraction,
  ticketId: number,
  stars: number,
): Promise<void> {
  const comment = interaction.fields.getTextInputValue("comment").trim() || null;
  const result = await handleRatingModal(
    interaction.client,
    ticketId,
    interaction.user.id,
    stars,
    comment,
  );
  if (!result.ok) {
    await interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({
    content: `✅ Danke für deine Bewertung! ${"⭐".repeat(stars)}`,
    flags: MessageFlags.Ephemeral,
  });
}

export default event;
