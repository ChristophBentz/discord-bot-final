import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.InviteDelete> = {
  name: Events.InviteDelete,
  async execute(invite) {
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
    if (invite.channelId) {
      fields.push({ name: "Channel", value: `<#${invite.channelId}>`, inline: true });
    }

    await sendLog(
      invite.client,
      "invites",
      serverEventEmbed({
        title: "Invite gelöscht",
        color: LOG_COLORS.leave,
        description: `discord.gg/${invite.code}`,
        fields,
      }),
    );
  },
};

export default event;
