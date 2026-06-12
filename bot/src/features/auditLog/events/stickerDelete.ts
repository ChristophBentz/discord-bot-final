import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS, fetchAuditExecutor } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildStickerDelete> = {
  name: Events.GuildStickerDelete,
  async execute(sticker) {
    const { executor } = sticker.guild
      ? await fetchAuditExecutor(sticker.guild, AuditLogEvent.StickerDelete, sticker.id)
      : { executor: null };

    await sendLog(
      sticker.client,
      "emojis",
      serverEventEmbed({
        title: "Sticker entfernt",
        color: LOG_COLORS.delete,
        description: sticker.name,
        fields: executor ? [{ name: "Von", value: `<@${executor.id}>`, inline: true }] : [],
        footer: `Sticker-ID: ${sticker.id}`,
      }),
    );
  },
};

export default event;
