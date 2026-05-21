"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type Result = { ok: true } | { ok: false; error: string };

async function getMod(): Promise<{ id: string; name: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as { discordId?: string }).discordId ?? "dashboard",
    name: session.user.name ?? "Staff",
  };
}

export async function unbanMember(userId: string, reason: string): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };
  const res = await callBot(`/api/members/${userId}/ban`, {
    method: "DELETE",
    body: { reason, moderatorId: mod.id, moderatorName: mod.name },
  });
  if (!res.ok) return res;
  revalidatePath("/dashboard/moderation");
  return { ok: true };
}

export async function removeTimeout(userId: string, reason: string): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };
  const res = await callBot(`/api/members/${userId}/timeout`, {
    method: "DELETE",
    body: { reason, moderatorId: mod.id, moderatorName: mod.name },
  });
  if (!res.ok) return res;
  revalidatePath("/dashboard/moderation");
  revalidatePath(`/dashboard/members/${userId}`);
  return { ok: true };
}
