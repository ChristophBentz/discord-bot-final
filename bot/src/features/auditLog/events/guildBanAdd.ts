import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog } from "../service.js";
import { memberBanEmbed } from "../embeds.js";

const event: BotEvent<Events.GuildBanAdd> = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    await sendLog(
      ban.client,
      "memberBan",
      memberBanEmbed({ user: ban.user, reason: ban.reason ?? null }),
    );
  },
};

export default event;
