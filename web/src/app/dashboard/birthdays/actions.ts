"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/requireAuth";

const SNOWFLAKE = /^\d{17,20}$/;

export type SaveBirthdayResult = { ok: true } | { ok: false; error: string };

export async function saveBirthdaySettings(formData: FormData): Promise<SaveBirthdayResult> {
  const auth = await requireAuth();
  if (auth) return auth;

  const enabled = formData.get("birthdayEnabled") === "on";
  const channelRaw = String(formData.get("birthdayChannelId") ?? "").trim();
  const pingRaw = String(formData.get("birthdayPingRoleId") ?? "").trim();
  const message = String(formData.get("birthdayMessage") ?? "").slice(0, 500);

  if (channelRaw && !SNOWFLAKE.test(channelRaw)) {
    return { ok: false, error: "Channel-ID muss eine Discord-Snowflake sein." };
  }
  if (pingRaw && !SNOWFLAKE.test(pingRaw)) {
    return { ok: false, error: "Rollen-ID muss eine Discord-Snowflake sein." };
  }
  if (enabled && !channelRaw) {
    return { ok: false, error: "Bitte einen Channel auswählen, wenn Geburtstage aktiv sind." };
  }

  const data = {
    birthdayEnabled: enabled,
    birthdayChannelId: channelRaw === "" ? null : channelRaw,
    birthdayPingRoleId: pingRaw === "" ? null : pingRaw,
    birthdayMessage: message.trim() === "" ? null : message,
  };

  await prisma.config.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  revalidatePath("/dashboard/birthdays");
  return { ok: true };
}
