import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS, fetchAuditExecutor } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildRoleCreate> = {
  name: Events.GuildRoleCreate,
  async execute(role) {
    const { executor } = await fetchAuditExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
    if (executor) fields.push({ name: "Von", value: `<@${executor.id}>`, inline: true });

    await sendLog(
      role.client,
      "serverRoles",
      serverEventEmbed({
        title: "Rolle erstellt",
        color: LOG_COLORS.join,
        description: `<@&${role.id}> (${role.name})`,
        fields,
        footer: `Rollen-ID: ${role.id}`,
      }),
    );
  },
};

export default event;
