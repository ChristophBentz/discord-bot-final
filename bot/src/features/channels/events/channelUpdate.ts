import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { upsertChannel } from "../service.js";

const event: BotEvent<Events.ChannelUpdate> = {
  name: Events.ChannelUpdate,
  async execute(_old, newChannel) {
    if (!("guild" in newChannel) || !newChannel.guild) return;
    await upsertChannel(newChannel);
  },
};

export default event;
