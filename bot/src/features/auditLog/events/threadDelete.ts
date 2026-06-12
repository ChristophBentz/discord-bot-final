import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.ThreadDelete> = {
  name: Events.ThreadDelete,
  async execute(thread) {
    // Ticket-Threads verwaltet der Bot selbst — nicht loggen.
    if (thread.ownerId && thread.ownerId === thread.client.user?.id) return;

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
    if (thread.parent) {
      fields.push({ name: "In Channel", value: `<#${thread.parent.id}>`, inline: true });
    }

    await sendLog(
      thread.client,
      "channels",
      serverEventEmbed({
        title: "Thread gelöscht",
        color: LOG_COLORS.delete,
        description: thread.name,
        fields,
        footer: `Thread-ID: ${thread.id}`,
      }),
    );
  },
};

export default event;
