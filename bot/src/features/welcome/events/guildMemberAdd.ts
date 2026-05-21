import { Events } from "discord.js";
import { prisma } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { applyAutoRoles, sendWelcome } from "../service.js";

const event: BotEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (!config) return;
    await applyAutoRoles(member, config);
    await sendWelcome(member.client, member, config);
  },
};

export default event;
