import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog, LOG_COLORS } from "../service.js";
import { serverEventEmbed } from "../embeds.js";

const event: BotEvent<Events.InviteCreate> = {
  name: Events.InviteCreate,
  async execute(invite) {
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
    if (invite.channelId) {
      fields.push({ name: "Channel", value: `<#${invite.channelId}>`, inline: true });
    }
    if (invite.inviter) {
      fields.push({ name: "Von", value: `<@${invite.inviter.id}>`, inline: true });
    }
    fields.push({
      name: "Max. Nutzungen",
      value: invite.maxUses ? String(invite.maxUses) : "∞",
      inline: true,
    });
    fields.push({
      name: "Läuft ab",
      value: invite.expiresTimestamp
        ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>`
        : "nie",
      inline: true,
    });

    await sendLog(
      invite.client,
      "invites",
      serverEventEmbed({
        title: "Invite erstellt",
        color: LOG_COLORS.join,
        description: `discord.gg/${invite.code}`,
        fields,
      }),
    );
  },
};

export default event;
