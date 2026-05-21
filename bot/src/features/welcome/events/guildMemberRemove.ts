import { Events } from "discord.js";
import { prisma } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { sendLeave } from "../service.js";

const event: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!member.user) return;
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (!config) return;
    await sendLeave(
      member.client,
      {
        id: member.id,
        username: member.user.username,
        displayName: member.displayName ?? member.user.username,
        avatarUrl: member.user.displayAvatarURL({ size: 64 }),
      },
      member.guild.memberCount,
      config,
    );
  },
};

export default event;
