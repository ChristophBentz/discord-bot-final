import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

// Massen-Löschung (z.B. via Bot-Purge oder Mod-Tools) — läuft unter der
// Kategorie "Nachricht gelöscht".
const event: BotEvent<Events.MessageBulkDelete> = {
  name: Events.MessageBulkDelete,
  async execute(messages, channel) {
    await sendLog(
      channel.client,
      "messageDelete",
      serverEventEmbed({
        title: "Nachrichten massenhaft gelöscht",
        color: LOG_COLORS.delete,
        description: `**${messages.size}** Nachrichten in <#${channel.id}>`,
      }),
    );
  },
};

export default event;
