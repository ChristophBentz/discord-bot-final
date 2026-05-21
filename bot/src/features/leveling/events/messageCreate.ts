import { Events } from "discord.js";
import { prisma } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { addXp } from "../service.js";
import { announceLevelUp } from "../levelUpNotifier.js";
import { incrementDailyActivity } from "../dailyActivity.js";
import { incrementChannelActivity } from "../channelActivity.js";
import { checkAndAwardAuto } from "../achievements.js";
import { logger } from "../../../lib/logger.js";

// In-Memory-Cooldown-Map (UserID -> Timestamp).
const cooldowns = new Map<string, number>();

const event: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    try {
      const config = await prisma.config.findUnique({ where: { id: 1 } });
      if (!config?.levelingEnabled) return;

      // Cooldown nur für XP, nicht für den Counter.
      const cooldownMs = config.xpCooldownSeconds * 1000;
      const now = Date.now();
      const last = cooldowns.get(message.author.id) ?? 0;
      const onCooldown = now - last < cooldownMs;

      let xp = 0;
      if (!onCooldown) {
        cooldowns.set(message.author.id, now);
        const min = Math.min(config.xpPerMessageMin, config.xpPerMessageMax);
        const max = Math.max(config.xpPerMessageMin, config.xpPerMessageMax);
        xp = Math.floor(Math.random() * (max - min + 1)) + min;
      }

      const result = await addXp(message.author.id, xp, {
        displayName: message.member?.displayName ?? message.author.username,
        messageIncrement: 1,
      });

      await incrementDailyActivity(message.author.id, { messages: 1 });
      await incrementChannelActivity(message.author.id, message.channelId);

      if (result.leveledUp) {
        await announceLevelUp({
          client: message.client,
          userId: message.author.id,
          newLevel: result.newLevel,
          fallbackChannelId: message.channelId,
        });
      }

      await checkAndAwardAuto(message.client, result.user);
    } catch (err) {
      logger.error({ err }, "Message-XP konnte nicht vergeben werden");
    }
  },
};

export default event;
