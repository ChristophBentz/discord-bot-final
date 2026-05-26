import { Events, type User } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { applyUniqueChoice, findPanelOptionByEmoji, toggleRoleForMember } from "../service.js";
import { prisma } from "@repo/db";
import { logger } from "../../../lib/logger.js";

const event: BotEvent<Events.MessageReactionAdd> = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    if (user.bot) return;
    try {
      // Partial-Reaction auflösen
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

      if (match.panel.uniqueChoice) {
        const full = await prisma.selfRolePanel.findUnique({
          where: { id: match.panel.id },
          include: { options: true },
        });
        if (full) await applyUniqueChoice(member, full, match.option.roleId);
      }

      const r = await toggleRoleForMember(member, match.option.roleId, "add");
      logger.debug(
        { panelId: match.panel.id, userId: member.id, roleId: match.option.roleId, action: r.action },
        "SelfRole: Reaction add",
      );
    } catch (err) {
      logger.warn({ err }, "SelfRole: messageReactionAdd-Fehler");
    }
  },
};

export default event;
