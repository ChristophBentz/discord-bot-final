import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { sendLog } from "../service.js";
import { voiceJoinEmbed, voiceLeaveEmbed, voiceMoveEmbed } from "../embeds.js";

const event: BotEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const user = newState.member?.user ?? oldState.member?.user;
    if (!user || user.bot) return;

    const oldChannel = oldState.channelId;
    const newChannel = newState.channelId;
    if (oldChannel === newChannel) return; // Mute/Deafen-Updates ignorieren

    const client = newState.client;

    if (!oldChannel && newChannel) {
      // Frisch beigetreten
      await sendLog(client, "voice", voiceJoinEmbed({ user, channelId: newChannel }));
    } else if (oldChannel && !newChannel) {
      // Voice komplett verlassen
      await sendLog(client, "voice", voiceLeaveEmbed({ user, channelId: oldChannel }));
    } else if (oldChannel && newChannel) {
      // Channel gewechselt
      await sendLog(
        client,
        "voice",
        voiceMoveEmbed({ user, fromChannelId: oldChannel, toChannelId: newChannel }),
      );
    }
  },
};

export default event;
