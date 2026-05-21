import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { markMemberLeft } from "../service.js";

const event: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    await markMemberLeft(member.id);
  },
};

export default event;
