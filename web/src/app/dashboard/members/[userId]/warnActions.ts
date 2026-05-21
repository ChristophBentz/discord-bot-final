"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type WarnResult =
  | { ok: true; warningId: number; dmSent: boolean; dmError?: string }
  | { ok: false; error: string };

export async function warnMember(userId: string, reason: string): Promise<WarnResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };

  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "Grund darf nicht leer sein." };
  if (trimmed.length > 500) return { ok: false, error: "Maximal 500 Zeichen." };

  const moderatorId =
    (session.user as { discordId?: string }).discordId ?? "dashboard";
  const moderatorName = session.user.name ?? "Staff";

  const res = await callBot<{ warningId: number; dmSent: boolean; dmError?: string }>(
    `/api/members/${userId}/warn`,
    {
      method: "POST",
      body: { reason: trimmed, moderatorId, moderatorName },
    },
  );

  if (!res.ok) return res;

  revalidatePath(`/dashboard/members/${userId}`);
  return {
    ok: true,
    warningId: res.data.warningId,
    dmSent: res.data.dmSent,
    dmError: res.data.dmError,
  };
}
