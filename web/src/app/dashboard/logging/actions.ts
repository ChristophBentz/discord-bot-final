"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";

const SNOWFLAKE = /^\d{17,20}$/;

export type SaveLoggingResult = { ok: true } | { ok: false; error: string };

export async function saveLoggingSettings(formData: FormData): Promise<SaveLoggingResult> {
  const rawChannel = String(formData.get("logChannelId") ?? "").trim();
  const channelId = rawChannel === "" ? null : rawChannel;

  if (channelId && !SNOWFLAKE.test(channelId)) {
    return { ok: false, error: "Channel-ID muss eine Discord-Snowflake sein (17–20 Ziffern)." };
  }

  const toggle = (name: string): boolean => formData.get(name) === "on";

  await prisma.config.upsert({
    where: { id: 1 },
    update: {
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
    },
    create: {
      id: 1,
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
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/logging");
  return { ok: true };
}
