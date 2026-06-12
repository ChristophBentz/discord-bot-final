import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildEmojiUpdate> = {
  name: Events.GuildEmojiUpdate,
  async execute(oldEmoji, newEmoji) {
    if (oldEmoji.name === newEmoji.name) return;

    await sendLog(
      newEmoji.client,
      "emojis",
      serverEventEmbed({
        title: "Emoji umbenannt",
        color: LOG_COLORS.update,
        description: `\`:${oldEmoji.name}:\` → \`:${newEmoji.name}:\``,
        thumbnail: newEmoji.imageURL({ size: 128 }),
        footer: `Emoji-ID: ${newEmoji.id}`,
      }),
    );
  },
};

export default event;
