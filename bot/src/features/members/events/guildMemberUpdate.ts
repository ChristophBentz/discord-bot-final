import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { upsertMember } from "../service.js";

const event: BotEvent<Events.GuildMemberUpdate> = {
  name: Events.GuildMemberUpdate,
  async execute(_oldMember, newMember) {
    await upsertMember(newMember);
  },
};

export default event;
