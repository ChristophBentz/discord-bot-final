"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";

const SNOWFLAKE = /^\d{17,20}$/;

export type SaveLevelingResult = { ok: true } | { ok: false; error: string };

function parseInt0(value: FormDataEntryValue | null, fallback: number, min = 0): number {
  if (value === null) return fallback;
  const n = Number(String(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.floor(n));
}

export async function saveLevelingSettings(formData: FormData): Promise<SaveLevelingResult> {
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

  const data = {
    levelingEnabled: enabled,
    levelUpChannelId: channelRaw === "" ? null : channelRaw,
    xpPerMessageMin: min,
    xpPerMessageMax: max,
    xpCooldownSeconds: cooldown,
    xpPerMinuteVoice: voiceRate,
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
