"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { callBot } from "@/lib/botApi";
import { requireAuth } from "@/lib/requireAuth";

const SNOWFLAKE = /^\d{17,20}$/;

export type SaveLoggingResult = { ok: true } | { ok: false; error: string };

export async function saveLoggingSettings(formData: FormData): Promise<SaveLoggingResult> {
  const auth = await requireAuth();
  if (auth) return auth;
  const rawChannel = String(formData.get("logChannelId") ?? "").trim();
  const channelId = rawChannel === "" ? null : rawChannel;

  if (channelId && !SNOWFLAKE.test(channelId)) {
    return { ok: false, error: "Channel-ID muss eine Discord-Snowflake sein (17–20 Ziffern)." };
  }

  const toggle = (name: string): boolean => formData.get(name) === "on";

  const data = {
    logChannelId: channelId,
    logMessageDelete: toggle("logMessageDelete"),
    logMessageEdit: toggle("logMessageEdit"),
    logMemberJoin: toggle("logMemberJoin"),
    logMemberLeave: toggle("logMemberLeave"),
    logMemberBan: toggle("logMemberBan"),
    logMemberUnban: toggle("logMemberUnban"),
    logMemberNickname: toggle("logMemberNickname"),
    logMemberRoles: toggle("logMemberRoles"),
    logVoice: toggle("logVoice"),
    logModeration: toggle("logModeration"),
    logChannels: toggle("logChannels"),
    logServerRoles: toggle("logServerRoles"),
    logServer: toggle("logServer"),
    logInvites: toggle("logInvites"),
    logEmojis: toggle("logEmojis"),
    recordModEvents: toggle("recordModEvents"),
  };

  await prisma.config.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  // Bot-Config-Cache invalidieren, damit die Toggles sofort wirken
  // (sonst bis zu 15s Verzögerung). Bot nicht erreichbar = nicht schlimm.
  await callBot("/api/auditlog/invalidate-cache", { method: "POST" }).catch(() => null);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/logging");
  return { ok: true };
}
