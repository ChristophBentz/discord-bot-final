"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/requireAuth";

const SNOWFLAKE = /^\d{17,20}$/;

export type SaveLevelingResult = { ok: true } | { ok: false; error: string };

function parseInt0(value: FormDataEntryValue | null, fallback: number, min = 0): number {
  if (value === null) return fallback;
  const n = Number(String(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.floor(n));
}

export async function saveLevelingSettings(formData: FormData): Promise<SaveLevelingResult> {
  const auth = await requireAuth();
  if (auth) return auth;
  const channelRaw = String(formData.get("levelUpChannelId") ?? "").trim();
  if (channelRaw && !SNOWFLAKE.test(channelRaw)) {
    return { ok: false, error: "Channel-ID muss eine Discord-Snowflake sein (17–20 Ziffern)." };
  }

  const min = parseInt0(formData.get("xpPerMessageMin"), 15, 0);
  const max = parseInt0(formData.get("xpPerMessageMax"), 25, 0);
  if (min > max) {
    return { ok: false, error: "Minimum-XP darf nicht größer als Maximum-XP sein." };
  }
  const cooldown = parseInt0(formData.get("xpCooldownSeconds"), 60, 0);
  const voiceRate = parseInt0(formData.get("xpPerMinuteVoice"), 5, 0);
  const enabled = formData.get("levelingEnabled") === "on";
  const levelBase = Math.max(10, Math.min(10000, parseInt0(formData.get("xpLevelBase"), 100, 10)));
  const levelMult = Math.max(0, Math.min(100, parseInt0(formData.get("xpLevelMultiplier"), 15, 0)));
  const levelUpMessage = String(formData.get("levelUpMessage") ?? "").slice(0, 500);

  const data = {
    levelingEnabled: enabled,
    levelUpChannelId: channelRaw === "" ? null : channelRaw,
    xpPerMessageMin: min,
    xpPerMessageMax: max,
    xpCooldownSeconds: cooldown,
    xpPerMinuteVoice: voiceRate,
    xpLevelBase: levelBase,
    xpLevelMultiplier: levelMult,
    levelUpMessage,
  };

  await prisma.config.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leveling");
  return { ok: true };
}
