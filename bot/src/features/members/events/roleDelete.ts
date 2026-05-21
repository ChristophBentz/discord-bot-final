import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { deleteRole } from "../service.js";

const event: BotEvent<Events.GuildRoleDelete> = {
  name: Events.GuildRoleDelete,
  async execute(role) {
    await deleteRole(role.id);
  },
};

export default event;
