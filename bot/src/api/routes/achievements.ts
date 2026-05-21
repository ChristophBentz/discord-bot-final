import type { Client } from "discord.js";
import { awardManually } from "../../features/leveling/achievements.js";

export interface AwardBody {
  moderatorId?: string;
}

export type AwardResult =
  | { ok: true; alreadyAwarded: boolean; dmSent: boolean; channelSent: boolean }
  | { ok: false; error: string };

export async function handleAwardAchievement(
  client: Client,
  userId: string,
  achievementId: number,
  body: AwardBody,
): Promise<AwardResult> {
  const moderatorId = (body.moderatorId ?? "").trim() || "unknown";
  return awardManually(client, userId, achievementId, moderatorId);
}
