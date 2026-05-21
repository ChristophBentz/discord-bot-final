import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { upsertRole } from "../service.js";

const event: BotEvent<Events.GuildRoleUpdate> = {
  name: Events.GuildRoleUpdate,
  async execute(_oldRole, newRole) {
    await upsertRole(newRole);
  },
};

export default event;
