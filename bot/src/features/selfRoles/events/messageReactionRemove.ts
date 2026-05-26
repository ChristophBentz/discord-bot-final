import { Events, type User } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { findPanelOptionByEmoji, toggleRoleForMember } from "../service.js";
import { logger } from "../../../lib/logger.js";

const event: BotEvent<Events.MessageReactionRemove> = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      const messageId = reaction.message.id;
      const key = reaction.emoji.id ?? reaction.emoji.name ?? "";
      if (!key) return;

      const match = await findPanelOptionByEmoji(messageId, key);
      if (!match) return;

      const guild = reaction.message.guild;
      if (!guild) return;
      const member = await guild.members.fetch((user as User).id).catch(() => null);
      if (!member) return;

      const r = await toggleRoleForMember(member, match.option.roleId, "remove");
      logger.debug(
        { panelId: match.panel.id, userId: member.id, roleId: match.option.roleId, action: r.action },
        "SelfRole: Reaction remove",
      );
    } catch (err) {
      logger.warn({ err }, "SelfRole: messageReactionRemove-Fehler");
    }
  },
};

export default event;
