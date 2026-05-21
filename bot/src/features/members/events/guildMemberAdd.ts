import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { upsertMember } from "../service.js";

const event: BotEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    await upsertMember(member);
  },
};

export default event;
