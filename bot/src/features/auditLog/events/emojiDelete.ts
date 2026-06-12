import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildEmojiDelete> = {
  name: Events.GuildEmojiDelete,
  async execute(emoji) {
    await sendLog(
      emoji.client,
      "emojis",
      serverEventEmbed({
        title: "Emoji entfernt",
        color: LOG_COLORS.delete,
        description: `\`:${emoji.name}:\``,
        thumbnail: emoji.imageURL({ size: 128 }),
        footer: `Emoji-ID: ${emoji.id}`,
      }),
    );
  },
};

export default event;
