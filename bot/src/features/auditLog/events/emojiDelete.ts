import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS, fetchAuditExecutor } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildEmojiDelete> = {
  name: Events.GuildEmojiDelete,
  async execute(emoji) {
    const { executor } = await fetchAuditExecutor(
      emoji.guild,
      AuditLogEvent.EmojiDelete,
      emoji.id,
    );

    await sendLog(
      emoji.client,
      "emojis",
      serverEventEmbed({
        title: "Emoji entfernt",
        color: LOG_COLORS.delete,
        description: `\`:${emoji.name}:\``,
        fields: executor ? [{ name: "Von", value: `<@${executor.id}>`, inline: true }] : [],
        thumbnail: emoji.imageURL({ size: 128 }),
        footer: `Emoji-ID: ${emoji.id}`,
      }),
    );
  },
};

export default event;
