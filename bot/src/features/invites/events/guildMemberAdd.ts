import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { recordJoin } from "../service.js";

const event: BotEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    await recordJoin(member);
  },
};

export default event;
