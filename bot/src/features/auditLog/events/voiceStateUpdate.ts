import { AuditLogEvent, Events } from "discord.js";
import type { BotEvent } from "../../../lib/types.js";
import { fetchRecentAudit, sendLog } from "../service.js";
import {
  memberForceDisconnectEmbed,
  memberForceMoveEmbed,
  voiceJoinEmbed,
  voiceLeaveEmbed,
  voiceMoveEmbed,
} from "../embeds.js";

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
      // Voice verlassen — check ob jemand ihn rausgeworfen hat
      const { executor } = await fetchRecentAudit(
        newState.guild,
        AuditLogEvent.MemberDisconnect,
      );
      if (executor && executor.id !== user.id) {
        await sendLog(
          client,
          "moderation",
          memberForceDisconnectEmbed({ user, fromChannelId: oldChannel, executor }),
        );
      } else {
        await sendLog(client, "voice", voiceLeaveEmbed({ user, channelId: oldChannel }));
      }
    } else if (oldChannel && newChannel) {
      // Channel gewechselt — check ob jemand ihn verschoben hat
      const { executor } = await fetchRecentAudit(
        newState.guild,
        AuditLogEvent.MemberMove,
      );
      if (executor && executor.id !== user.id) {
        await sendLog(
          client,
          "moderation",
          memberForceMoveEmbed({
            user,
            fromChannelId: oldChannel,
            toChannelId: newChannel,
            executor,
          }),
        );
      } else {
        await sendLog(
          client,
          "voice",
          voiceMoveEmbed({ user, fromChannelId: oldChannel, toChannelId: newChannel }),
        );
      }
    }
  },
};

export default event;
