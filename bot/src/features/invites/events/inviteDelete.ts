import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { trackInviteDelete } from "../service.js";

const event: BotEvent<Events.InviteDelete> = {
  name: Events.InviteDelete,
  execute(invite) {
    trackInviteDelete(invite);
  },
};

export default event;
