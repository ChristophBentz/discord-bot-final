import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog } from "../service.js";
import { messageEditEmbed } from "../embeds.js";

const event: BotEvent<Events.MessageUpdate> = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;
    // Discord triggert Update auch bei Embeds, die sich rendern — wir wollen nur echte Edits.
    if (oldMessage.content === newMessage.content) return;
    if (!newMessage.author) return;

    await sendLog(
      newMessage.client,
      "messageEdit",
      messageEditEmbed({
        author: newMessage.author,
        channelId: newMessage.channelId,
        messageId: newMessage.id,
        before: oldMessage.content ?? null,
        after: newMessage.content ?? "",
        jumpUrl: newMessage.url,
      }),
    );
  },
};

export default event;
