import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildStickerDelete> = {
  name: Events.GuildStickerDelete,
  async execute(sticker) {
    await sendLog(
      sticker.client,
      "emojis",
      serverEventEmbed({
        title: "Sticker entfernt",
        color: LOG_COLORS.delete,
        description: sticker.name,
        footer: `Sticker-ID: ${sticker.id}`,
      }),
    );
  },
};

export default event;
