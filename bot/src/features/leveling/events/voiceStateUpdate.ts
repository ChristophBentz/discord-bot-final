import { Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { endSession, startSession } from "../voiceSessions.js";

const event: BotEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const user = newState.member?.user ?? oldState.member?.user;
    if (!user || user.bot) return;

    const old = oldState.channelId;
    const now = newState.channelId;
    if (old === now) return; // Mute/Deafen-Updates ignorieren

    if (!old && now) {
      startSession(user.id);
    } else if (old && !now) {
      const displayName =
        oldState.member?.displayName ?? oldState.member?.user.username ?? user.username;
      await endSession(newState.client, user.id, displayName);
    }
    // Beim Wechsel (old && now) läuft die Session weiter — User ist immer noch in Voice.
  },
};

export default event;
