import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { trackInviteCreate } from "../service.js";

const event: BotEvent<Events.InviteCreate> = {
  name: Events.InviteCreate,
  execute(invite) {
    trackInviteCreate(invite);
  },
};

export default event;
