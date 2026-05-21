import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog } from "../service.js";
import { memberJoinEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    await sendLog(member.client, "memberJoin", memberJoinEmbed(member));
  },
};

export default event;
