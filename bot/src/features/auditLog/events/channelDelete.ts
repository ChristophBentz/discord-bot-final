import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";
import { channelTypeLabel, executorUnlessSelf } from "../util.js";

const event: BotEvent<Events.ChannelDelete> = {
  name: Events.ChannelDelete,
  async execute(channel) {
    if (channel.isDMBased()) return;

    const { skip, executor } = await executorUnlessSelf(
      channel.guild,
      AuditLogEvent.ChannelDelete,
      channel.id,
    );
    if (skip) return; // z.B. Temp-Channels vom Bot selbst

    const fields = [{ name: "Typ", value: channelTypeLabel(channel.type), inline: true }];
    if (channel.parent) {
      fields.push({ name: "Kategorie", value: channel.parent.name, inline: true });
    }
    if (executor) fields.push({ name: "Von", value: `<@${executor.id}>`, inline: true });

    await sendLog(
      channel.client,
      "channels",
      serverEventEmbed({
        title: "Channel gelöscht",
        color: LOG_COLORS.delete,
        description: `#${channel.name}`,
        fields,
        footer: `Channel-ID: ${channel.id}`,
      }),
    );
  },
};

export default event;
