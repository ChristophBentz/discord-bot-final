"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type ModResult =
  | { ok: true; dmSent: boolean; dmError?: string }
  | { ok: false; error: string };

async function getModerator(): Promise<{ id: string; name: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as { discordId?: string }).discordId ?? "dashboard",
    name: session.user.name ?? "Staff",
  };
}

export async function timeoutMember(
  userId: string,
  reason: string,
  durationSeconds: number,
): Promise<ModResult> {
  const mod = await getModerator();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };

  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "Grund darf nicht leer sein." };
  if (durationSeconds <= 0) return { ok: false, error: "Dauer muss > 0 sein." };

  const res = await callBot<{ dmSent: boolean; dmError?: string }>(
    `/api/members/${userId}/timeout`,
    {
      method: "POST",
      body: { reason: trimmed, durationSeconds, moderatorId: mod.id, moderatorName: mod.name },
    },
  );
  if (!res.ok) return res;
  revalidatePath(`/dashboard/members/${userId}`);
  return { ok: true, dmSent: res.data.dmSent, dmError: res.data.dmError };
}

export async function kickMember(userId: string, reason: string): Promise<ModResult> {
  const mod = await getModerator();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };

  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "Grund darf nicht leer sein." };

  const res = await callBot<{ dmSent: boolean; dmError?: string }>(
    `/api/members/${userId}/kick`,
    {
      method: "POST",
      body: { reason: trimmed, moderatorId: mod.id, moderatorName: mod.name },
    },
  );
  if (!res.ok) return res;
  revalidatePath(`/dashboard/members/${userId}`);
  revalidatePath("/dashboard/members");
  return { ok: true, dmSent: res.data.dmSent, dmError: res.data.dmError };
}

export async function banMember(
  userId: string,
  reason: string,
  deleteMessageDays: number,
): Promise<ModResult> {
  const mod = await getModerator();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };

  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "Grund darf nicht leer sein." };

  const res = await callBot<{ dmSent: boolean; dmError?: string }>(
    `/api/members/${userId}/ban`,
    {
      method: "POST",
      body: {
        reason: trimmed,
        deleteMessageDays,
        moderatorId: mod.id,
        moderatorName: mod.name,
      },
    },
  );
  if (!res.ok) return res;
  revalidatePath(`/dashboard/members/${userId}`);
  revalidatePath("/dashboard/members");
  return { ok: true, dmSent: res.data.dmSent, dmError: res.data.dmError };
}
