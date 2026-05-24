"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { callBot } from "@/lib/botApi";

const MAX_STATUS_LENGTH = 128;
const MAX_NICKNAME_LENGTH = 32;

export type SaveStatusResult =
  | { ok: true; text: string | null }
  | { ok: false; error: string };

export async function saveBotStatus(formData: FormData): Promise<SaveStatusResult> {
  const raw = String(formData.get("botStatusText") ?? "").trim();

  if (raw.length > MAX_STATUS_LENGTH) {
    return { ok: false, error: `Maximal ${MAX_STATUS_LENGTH} Zeichen erlaubt.` };
  }

  const text = raw === "" ? null : raw;

  await prisma.config.upsert({
    where: { id: 1 },
    update: { botStatusText: text },
    create: { id: 1, botStatusText: text },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/general");

  return { ok: true, text };
}

export type SaveNicknameResult =
  | { ok: true; nickname: string | null }
  | { ok: false; error: string };

export async function saveBotNickname(formData: FormData): Promise<SaveNicknameResult> {
  const raw = String(formData.get("botNickname") ?? "").trim();
  if (raw.length > MAX_NICKNAME_LENGTH) {
    return { ok: false, error: `Maximal ${MAX_NICKNAME_LENGTH} Zeichen erlaubt.` };
  }
  const nickname = raw === "" ? null : raw;

  const r = await callBot<{ nickname: string | null }>("/api/bot/nickname", {
    method: "POST",
    body: { nickname },
  });
  if (!r.ok) return { ok: false, error: r.error };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/general");
  return { ok: true, nickname: r.data.nickname };
}
