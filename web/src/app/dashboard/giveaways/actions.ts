"use server";

import { revalidatePath } from "next/cache";
import { callBot } from "@/lib/botApi";
import { requireAuth, sessionDiscordId } from "@/lib/requireAuth";

export type Result = { ok: true } | { ok: false; error: string };

export interface CreateInput {
  channelId: string;
  prize: string;
  description?: string;
  rewardCode?: string;
  winnerCount: number;
  durationSeconds: number;
  minLevel?: number | null;
  requiredRoleId?: string | null;
  minMemberDays?: number | null;
}

export async function createGiveaway(input: CreateInput): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const hostId = (await sessionDiscordId()) ?? "dashboard";

  const r = await callBot<{ id: number }>("/api/giveaways", {
    method: "POST",
    body: { ...input, hostId },
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/giveaways");
  return { ok: true };
}

export async function endGiveaway(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot(`/api/giveaways/${id}/end`, { method: "POST" });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/giveaways");
  return { ok: true };
}

export async function rerollGiveaway(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot(`/api/giveaways/${id}/reroll`, { method: "POST" });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/giveaways");
  return { ok: true };
}

export async function deleteGiveaway(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot(`/api/giveaways/${id}`, { method: "DELETE" });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/giveaways");
  return { ok: true };
}
