"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type AwardResult =
  | { ok: true; alreadyAwarded: boolean; dmSent: boolean; channelSent: boolean }
  | { ok: false; error: string };

export async function awardAchievement(
  userId: string,
  achievementId: number,
): Promise<AwardResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };

  const moderatorId =
    (session.user as { discordId?: string }).discordId ?? "dashboard";

  const res = await callBot<{
    alreadyAwarded: boolean;
    dmSent: boolean;
    channelSent: boolean;
  }>(`/api/members/${userId}/achievements/${achievementId}`, {
    method: "POST",
    body: { moderatorId },
  });

  if (!res.ok) return res;

  revalidatePath(`/dashboard/members/${userId}`);
  return {
    ok: true,
    alreadyAwarded: res.data.alreadyAwarded,
    dmSent: res.data.dmSent,
    channelSent: res.data.channelSent,
  };
}
