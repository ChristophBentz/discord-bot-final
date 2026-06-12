import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS, fetchAuditExecutor } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildRoleDelete> = {
  name: Events.GuildRoleDelete,
  async execute(role) {
    const { executor } = await fetchAuditExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
    if (executor) fields.push({ name: "Von", value: `<@${executor.id}>`, inline: true });

    await sendLog(
      role.client,
      "serverRoles",
      serverEventEmbed({
        title: "Rolle gelöscht",
        color: LOG_COLORS.delete,
        description: role.name,
        fields,
        footer: `Rollen-ID: ${role.id}`,
      }),
    );
  },
};

export default event;
