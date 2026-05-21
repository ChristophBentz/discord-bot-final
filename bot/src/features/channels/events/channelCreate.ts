import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { upsertChannel } from "../service.js";

const event: BotEvent<Events.ChannelCreate> = {
  name: Events.ChannelCreate,
  async execute(channel) {
    if (!("guild" in channel) || !channel.guild) return;
    await upsertChannel(channel);
  },
};

export default event;
