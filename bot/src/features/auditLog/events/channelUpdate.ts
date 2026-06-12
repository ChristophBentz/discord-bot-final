import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";
import { executorUnlessSelf } from "../util.js";

// Nur inhaltliche Änderungen loggen — Positions-/Permission-Umsortierungen
// feuern für viele Channels gleichzeitig und wären reiner Spam.
const event: BotEvent<Events.ChannelUpdate> = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel) {
    if (oldChannel.isDMBased() || newChannel.isDMBased()) return;

    const changes: Array<{ name: string; value: string }> = [];

    if (oldChannel.name !== newChannel.name) {
      changes.push({ name: "Name", value: `#${oldChannel.name} → #${newChannel.name}` });
    }
    if ("topic" in oldChannel && "topic" in newChannel && oldChannel.topic !== newChannel.topic) {
      changes.push({
        name: "Topic",
        value: `${oldChannel.topic || "*(leer)*"} → ${newChannel.topic || "*(leer)*"}`,
      });
    }
    if ("nsfw" in oldChannel && "nsfw" in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
      changes.push({ name: "NSFW", value: newChannel.nsfw ? "aktiviert" : "deaktiviert" });
    }
    if (
      "rateLimitPerUser" in oldChannel &&
      "rateLimitPerUser" in newChannel &&
      oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser
    ) {
      changes.push({
        name: "Slowmode",
        value: `${oldChannel.rateLimitPerUser ?? 0}s → ${newChannel.rateLimitPerUser ?? 0}s`,
      });
    }
    if (
      "bitrate" in oldChannel &&
      "bitrate" in newChannel &&
      oldChannel.bitrate !== newChannel.bitrate
    ) {
      changes.push({
        name: "Bitrate",
        value: `${Math.round(oldChannel.bitrate / 1000)}kbps → ${Math.round(newChannel.bitrate / 1000)}kbps`,
      });
    }
    if (
      "userLimit" in oldChannel &&
      "userLimit" in newChannel &&
      oldChannel.userLimit !== newChannel.userLimit
    ) {
      changes.push({
        name: "User-Limit",
        value: `${oldChannel.userLimit || "∞"} → ${newChannel.userLimit || "∞"}`,
      });
    }

    if (changes.length === 0) return;

    const { skip, executor } = await executorUnlessSelf(
      newChannel.guild,
      AuditLogEvent.ChannelUpdate,
      newChannel.id,
    );
    if (skip) return; // z.B. Server-Stats-Renames vom Bot selbst

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [...changes];
    if (executor) fields.push({ name: "Von", value: `<@${executor.id}>`, inline: true });

    await sendLog(
      newChannel.client,
      "channels",
      serverEventEmbed({
        title: "Channel geändert",
        color: LOG_COLORS.update,
        description: `<#${newChannel.id}>`,
        fields,
        footer: `Channel-ID: ${newChannel.id}`,
      }),
    );
  },
};

export default event;
