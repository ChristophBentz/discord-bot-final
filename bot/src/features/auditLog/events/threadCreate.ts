import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.ThreadCreate> = {
  name: Events.ThreadCreate,
  async execute(thread, newlyCreated) {
    if (!newlyCreated) return;
    // Ticket-Threads legt der Bot selbst an — nicht loggen.
    if (thread.ownerId && thread.ownerId === thread.client.user?.id) return;

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
    if (thread.parent) {
      fields.push({ name: "In Channel", value: `<#${thread.parent.id}>`, inline: true });
    }
    if (thread.ownerId) {
      fields.push({ name: "Von", value: `<@${thread.ownerId}>`, inline: true });
    }

    await sendLog(
      thread.client,
      "channels",
      serverEventEmbed({
        title: "Thread erstellt",
        color: LOG_COLORS.join,
        description: `<#${thread.id}> (${thread.name})`,
        fields,
        footer: `Thread-ID: ${thread.id}`,
      }),
    );
  },
};

export default event;
