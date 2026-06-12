import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS, fetchAuditExecutor } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildStickerCreate> = {
  name: Events.GuildStickerCreate,
  async execute(sticker) {
    const { executor } = sticker.guild
      ? await fetchAuditExecutor(sticker.guild, AuditLogEvent.StickerCreate, sticker.id)
      : { executor: null };

    await sendLog(
      sticker.client,
      "emojis",
      serverEventEmbed({
        title: "Sticker hinzugefügt",
        color: LOG_COLORS.join,
        description: sticker.name,
        fields: executor ? [{ name: "Von", value: `<@${executor.id}>`, inline: true }] : [],
        thumbnail: sticker.url,
        footer: `Sticker-ID: ${sticker.id}`,
      }),
    );
  },
};

export default event;
