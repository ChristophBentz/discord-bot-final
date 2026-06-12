import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS, fetchAuditExecutor } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildUpdate> = {
  name: Events.GuildUpdate,
  async execute(oldGuild, newGuild) {
    const changes: Array<{ name: string; value: string }> = [];

    if (oldGuild.name !== newGuild.name) {
      changes.push({ name: "Name", value: `${oldGuild.name} → ${newGuild.name}` });
    }
    if (oldGuild.description !== newGuild.description) {
      changes.push({
        name: "Beschreibung",
        value: `${oldGuild.description || "*(leer)*"} → ${newGuild.description || "*(leer)*"}`,
      });
    }
    if (oldGuild.icon !== newGuild.icon) {
      changes.push({ name: "Icon", value: "geändert" });
    }
    if (oldGuild.banner !== newGuild.banner) {
      changes.push({ name: "Banner", value: "geändert" });
    }
    if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
      changes.push({
        name: "AFK-Channel",
        value: `${oldGuild.afkChannelId ? `<#${oldGuild.afkChannelId}>` : "—"} → ${
          newGuild.afkChannelId ? `<#${newGuild.afkChannelId}>` : "—"
        }`,
      });
    }
    if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
      changes.push({
        name: "AFK-Timeout",
        value: `${Math.round(oldGuild.afkTimeout / 60)} Min → ${Math.round(newGuild.afkTimeout / 60)} Min`,
      });
    }
    if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
      changes.push({
        name: "System-Channel",
        value: `${oldGuild.systemChannelId ? `<#${oldGuild.systemChannelId}>` : "—"} → ${
          newGuild.systemChannelId ? `<#${newGuild.systemChannelId}>` : "—"
        }`,
      });
    }
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      changes.push({
        name: "Vanity-URL",
        value: `${oldGuild.vanityURLCode ?? "—"} → ${newGuild.vanityURLCode ?? "—"}`,
      });
    }

    if (changes.length === 0) return;

    const { executor } = await fetchAuditExecutor(
      newGuild,
      AuditLogEvent.GuildUpdate,
      newGuild.id,
    );

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [...changes];
    if (executor) fields.push({ name: "Von", value: `<@${executor.id}>`, inline: true });

    await sendLog(
      newGuild.client,
      "server",
      serverEventEmbed({
        title: "Server-Einstellungen geändert",
        color: LOG_COLORS.update,
        fields,
        thumbnail: newGuild.iconURL({ size: 128 }) ?? undefined,
      }),
    );
  },
};

export default event;
