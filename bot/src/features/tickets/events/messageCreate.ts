import { Events } from "discord.js";
import { prisma } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { closeTicket, getTicketByThread } from "../service.js";

const event: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!message.channel.isThread()) return;

    const ticket = await getTicketByThread(message.channelId);
    if (!ticket) return;
    if (ticket.status !== "open") return;

    // Self-Close mit !close
    if (message.content.trim().toLowerCase() === "!close") {
      await closeTicket(message.client, ticket.id, message.author.id);
      return;
    }

    // Sonst: User-Nachricht in DB spiegeln
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: message.author.id,
        authorName: message.author.username,
        fromMod: false,
        content: message.content || "(leer / Anhang)",
      },
    });
  },
};

export default event;
