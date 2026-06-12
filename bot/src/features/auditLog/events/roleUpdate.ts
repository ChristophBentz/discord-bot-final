import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS, fetchAuditExecutor } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

// Nur inhaltliche Änderungen loggen — Positions-Umsortierungen feuern für
// viele Rollen gleichzeitig und wären reiner Spam.
const event: BotEvent<Events.GuildRoleUpdate> = {
  name: Events.GuildRoleUpdate,
  async execute(oldRole, newRole) {
    const changes: Array<{ name: string; value: string }> = [];

    if (oldRole.name !== newRole.name) {
      changes.push({ name: "Name", value: `${oldRole.name} → ${newRole.name}` });
    }
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push({ name: "Farbe", value: `${oldRole.hexColor} → ${newRole.hexColor}` });
    }
    if (oldRole.hoist !== newRole.hoist) {
      changes.push({
        name: "Separat anzeigen",
        value: newRole.hoist ? "aktiviert" : "deaktiviert",
      });
    }
    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push({
        name: "Erwähnbar",
        value: newRole.mentionable ? "aktiviert" : "deaktiviert",
      });
    }

    const addedPerms = newRole.permissions
      .toArray()
      .filter((p) => !oldRole.permissions.has(p));
    const removedPerms = oldRole.permissions
      .toArray()
      .filter((p) => !newRole.permissions.has(p));
    if (addedPerms.length > 0) {
      changes.push({ name: "Berechtigungen hinzugefügt", value: addedPerms.join(", ") });
    }
    if (removedPerms.length > 0) {
      changes.push({ name: "Berechtigungen entfernt", value: removedPerms.join(", ") });
    }

    if (changes.length === 0) return;

    const { executor } = await fetchAuditExecutor(
      newRole.guild,
      AuditLogEvent.RoleUpdate,
      newRole.id,
    );

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [...changes];
    if (executor) fields.push({ name: "Von", value: `<@${executor.id}>`, inline: true });

    await sendLog(
      newRole.client,
      "serverRoles",
      serverEventEmbed({
        title: "Rolle geändert",
        color: LOG_COLORS.update,
        description: `<@&${newRole.id}>`,
        fields,
        footer: `Rollen-ID: ${newRole.id}`,
      }),
    );
  },
};

export default event;
