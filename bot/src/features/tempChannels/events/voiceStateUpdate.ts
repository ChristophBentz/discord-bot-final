import { Events } from "discord.js";
import { prisma } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { createTempChannel, findTrigger, maybeDeleteTempChannel } from "../service.js";

const event: BotEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (!config) return;

    // 1) Hat User einen Trigger-Channel betreten? → neuen Temp-Channel mit dessen Settings erstellen
    if (
      config.tempChannelEnabled &&
      newState.channelId &&
      newState.channelId !== oldState.channelId
    ) {
      const trigger = await findTrigger(newState.channelId);
      if (trigger) {
        await createTempChannel(newState, config, trigger);
      }
    }

    // 2) Hat User einen Temp-Channel verlassen? → ggf. löschen wenn leer
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      await maybeDeleteTempChannel(newState.client, oldState.channelId);
    }
  },
};

export default event;
