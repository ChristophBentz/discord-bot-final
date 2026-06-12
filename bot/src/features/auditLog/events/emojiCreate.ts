import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildEmojiCreate> = {
  name: Events.GuildEmojiCreate,
  async execute(emoji) {
    await sendLog(
      emoji.client,
      "emojis",
      serverEventEmbed({
        title: "Emoji hinzugefügt",
        color: LOG_COLORS.join,
        description: `\`:${emoji.name}:\``,
        thumbnail: emoji.imageURL({ size: 128 }),
        footer: `Emoji-ID: ${emoji.id}`,
      }),
    );
  },
};

export default event;
