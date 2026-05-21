import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { upsertRole } from "../service.js";

const event: BotEvent<Events.GuildRoleCreate> = {
  name: Events.GuildRoleCreate,
  async execute(role) {
    await upsertRole(role);
  },
};

export default event;
