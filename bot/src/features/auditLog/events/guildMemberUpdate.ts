import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { fetchAuditExecutor, sendLog } from "../service.js";
import { nicknameChangeEmbed, rolesChangeEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildMemberUpdate> = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    // Nickname-Änderung
    if (oldMember.nickname !== newMember.nickname) {
      const { executor, reason } = await fetchAuditExecutor(
        newMember.guild,
        AuditLogEvent.MemberUpdate,
        newMember.id,
      );
      await sendLog(
        newMember.client,
        "memberNickname",
        nicknameChangeEmbed({
          user: newMember.user,
          before: oldMember.nickname,
          after: newMember.nickname,
          executor,
          reason,
        }),
      );
    }

    // Rollen-Änderung
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());
    const added = [...newRoles].filter((id) => !oldRoles.has(id) && id !== newMember.guild.id);
    const removed = [...oldRoles].filter((id) => !newRoles.has(id) && id !== newMember.guild.id);

    if (added.length > 0 || removed.length > 0) {
      const { executor, reason } = await fetchAuditExecutor(
        newMember.guild,
        AuditLogEvent.MemberRoleUpdate,
        newMember.id,
      );
      await sendLog(
        newMember.client,
        "memberRoles",
        rolesChangeEmbed({ user: newMember.user, added, removed, executor, reason }),
      );
    }
  },
};

export default event;
