import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { fetchAuditExecutor, sendLog } from "../service.js";
import { memberKickEmbed, memberLeaveEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!member.user) return;

    // Check ob es eine Kick-Aktion war (Discord Audit-Log innerhalb der letzten 5s)
    const { executor, reason } = await fetchAuditExecutor(
      member.guild,
      AuditLogEvent.MemberKick,
      member.id,
    );

    if (executor) {
      // → Kick. Logge als Moderation-Action.
      await sendLog(
        member.client,
        "moderation",
        memberKickEmbed({ user: member.user, executor, reason }),
      );
      return;
    }

    // → Normal verlassen.
    const roles = member.roles?.cache
      ? Array.from(member.roles.cache.keys()).filter((id) => id !== member.guild.id)
      : [];
    await sendLog(
      member.client,
      "memberLeave",
      memberLeaveEmbed({
        user: member.user,
        joinedAt: member.joinedAt,
        roles,
      }),
    );
  },
};

export default event;
