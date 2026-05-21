import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { deleteChannel } from "../service.js";

const event: BotEvent<Events.ChannelDelete> = {
  name: Events.ChannelDelete,
  async execute(channel) {
    await deleteChannel(channel.id);
  },
};

export default event;
