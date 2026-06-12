"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type RoleActionResult = { ok: true } | { ok: false; error: string };

// Liefert die Discord-ID des eingeloggten Mods — der Bot prüft damit die
// Rollenhierarchie, damit niemand sich Rollen über der eigenen geben kann.
async function getActorId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
}

export async function assignRole(userId: string, roleId: string): Promise<RoleActionResult> {
  const actorId = await getActorId();
  if (!actorId) return { ok: false, error: "Nicht eingeloggt." };
  const res = await callBot(`/api/members/${userId}/roles`, {
    method: "POST",
    body: { add: [roleId], actorId },
  });
  if (!res.ok) return res;
  revalidatePath(`/dashboard/members/${userId}`);
  revalidatePath("/dashboard/members");
  return { ok: true };
}

export async function removeRole(userId: string, roleId: string): Promise<RoleActionResult> {
  const actorId = await getActorId();
  if (!actorId) return { ok: false, error: "Nicht eingeloggt." };
  const res = await callBot(`/api/members/${userId}/roles`, {
    method: "POST",
    body: { remove: [roleId], actorId },
  });
  if (!res.ok) return res;
  revalidatePath(`/dashboard/members/${userId}`);
  revalidatePath("/dashboard/members");
  return { ok: true };
}
