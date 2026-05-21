import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog } from "../service.js";
import { messageDeleteEmbed } from "../embeds.js";

const event: BotEvent<Events.MessageDelete> = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild) return;
    // Bot-Nachrichten ignorieren, sonst loggen wir uns selbst.
    if (message.author?.bot) return;

    await sendLog(
      message.client,
      "messageDelete",
      messageDeleteEmbed({
        author: message.author,
        channelId: message.channelId,
        content: message.content ?? null,
        messageId: message.id,
      }),
    );
  },
};

export default event;
