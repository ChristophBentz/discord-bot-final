"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { callBot } from "@/lib/botApi";
import { verifyAppealToken } from "@/lib/appealToken";

const MIN_LENGTH = 20;
const MAX_LENGTH = 2000;

export type SubmitResult = { ok: true } | { ok: false; error: string };

interface BanEntry {
  userId: string;
  username: string;
  reason: string | null;
}

export async function submitAppeal(
  userId: string,
  key: string,
  formData: FormData,
): Promise<SubmitResult> {
  if (!/^\d{17,20}$/.test(userId) || !verifyAppealToken(userId, key)) {
    return { ok: false, error: "Ungültiger Link." };
  }

  const text = String(formData.get("text") ?? "").trim();
  if (text.length < MIN_LENGTH) {
    return { ok: false, error: `Bitte begründe deinen Antrag (mind. ${MIN_LENGTH} Zeichen).` };
  }
  if (text.length > MAX_LENGTH) {
    return { ok: false, error: `Maximal ${MAX_LENGTH} Zeichen erlaubt.` };
  }

  // Ein offener/abgelehnter Antrag blockiert weitere — nur nach angenommenem
  // Antrag (= erneuter Ban) darf neu eingereicht werden.
  const latest = await prisma.banAppeal.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (latest && latest.status !== "approved") {
    return { ok: false, error: "Es liegt bereits ein Antrag vor." };
  }

  // Username + Ban-Grund als Snapshot — der User verschwindet irgendwann aus dem
  // Member-Sync. Wenn der Bot erreichbar ist, prüfen wir auch, ob der Ban noch besteht.
  const member = await prisma.member.findUnique({ where: { userId } });
  const botRes = await callBot<{ bans: BanEntry[] }>("/api/moderation/state", {
    method: "GET",
  });
  const banEntry = botRes.ok
    ? botRes.data.bans.find((b) => b.userId === userId)
    : undefined;
  if (botRes.ok && !banEntry) {
    return { ok: false, error: "Du bist nicht (mehr) gebannt." };
  }

  await prisma.banAppeal.create({
    data: {
      userId,
      username: banEntry?.username ?? member?.username ?? `User ${userId.slice(-4)}`,
      banReason: banEntry?.reason ?? null,
      text,
    },
  });

  revalidatePath(`/appeal/${userId}`);
  revalidatePath("/dashboard/moderation");
  return { ok: true };
}
