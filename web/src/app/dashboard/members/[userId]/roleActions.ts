"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type RoleActionResult = { ok: true } | { ok: false; error: string };

async function requireAuth(): Promise<RoleActionResult | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

export async function assignRole(userId: string, roleId: string): Promise<RoleActionResult> {
  const auth = await requireAuth();
  if (auth) return auth;
  const res = await callBot(`/api/members/${userId}/roles`, {
    method: "POST",
    body: { add: [roleId] },
  });
  if (!res.ok) return res;
  revalidatePath(`/dashboard/members/${userId}`);
  revalidatePath("/dashboard/members");
  return { ok: true };
}

export async function removeRole(userId: string, roleId: string): Promise<RoleActionResult> {
  const auth = await requireAuth();
  if (auth) return auth;
  const res = await callBot(`/api/members/${userId}/roles`, {
    method: "POST",
    body: { remove: [roleId] },
  });
  if (!res.ok) return res;
  revalidatePath(`/dashboard/members/${userId}`);
  revalidatePath("/dashboard/members");
  return { ok: true };
}
