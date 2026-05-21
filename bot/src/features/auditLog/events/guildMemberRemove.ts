import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog } from "../service.js";
import { memberLeaveEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!member.user) return;
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
