import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog } from "../service.js";
import { memberUnbanEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildBanRemove> = {
  name: Events.GuildBanRemove,
  async execute(ban) {
    await sendLog(ban.client, "memberUnban", memberUnbanEmbed(ban.user));
  },
};

export default event;
