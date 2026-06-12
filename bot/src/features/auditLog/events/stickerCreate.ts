import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildStickerCreate> = {
  name: Events.GuildStickerCreate,
  async execute(sticker) {
    await sendLog(
      sticker.client,
      "emojis",
      serverEventEmbed({
        title: "Sticker hinzugefügt",
        color: LOG_COLORS.join,
        description: sticker.name,
        thumbnail: sticker.url,
        footer: `Sticker-ID: ${sticker.id}`,
      }),
    );
  },
};

export default event;
