"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SNOWFLAKE = /^\d{17,20}$/;

export type Result = { ok: true } | { ok: false; error: string };

async function requireAuth(): Promise<Result | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

export async function saveTempChannelSettings(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const enabled = formData.get("tempChannelEnabled") === "on";
  const category = String(formData.get("tempChannelCategoryId") ?? "").trim();
  const template = String(formData.get("tempChannelNameTemplate") ?? "").trim();

  if (category && !SNOWFLAKE.test(category)) {
    return { ok: false, error: "Category-ID muss eine Snowflake sein." };
  }
  const nameTemplate = template || "🎙️ {nick}'s Channel";
  if (nameTemplate.length > 90) {
    return { ok: false, error: "Name-Template max. 90 Zeichen." };
  }

  await prisma.config.upsert({
    where: { id: 1 },
    update: {
      tempChannelEnabled: enabled,
      tempChannelCategoryId: category === "" ? null : category,
      tempChannelNameTemplate: nameTemplate,
    },
    create: {
      id: 1,
      tempChannelEnabled: enabled,
      tempChannelCategoryId: category === "" ? null : category,
      tempChannelNameTemplate: nameTemplate,
    },
  });

  revalidatePath("/dashboard/temp-channels");
  return { ok: true };
}

export async function addTrigger(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const channelId = String(formData.get("channelId") ?? "").trim();
  if (!SNOWFLAKE.test(channelId)) {
    return { ok: false, error: "Channel-ID muss eine Snowflake sein." };
  }

  const limitRaw = Number(formData.get("userLimit") ?? 0);
  const userLimit = Number.isFinite(limitRaw)
    ? Math.max(0, Math.min(99, Math.floor(limitRaw)))
    : 0;

  const template = String(formData.get("nameTemplate") ?? "").trim();
  if (template.length > 90) {
    return { ok: false, error: "Name-Template max. 90 Zeichen." };
  }

  try {
    await prisma.tempChannelTrigger.create({
      data: {
        channelId,
        userLimit,
        nameTemplate: template === "" ? null : template,
      },
    });
  } catch {
    return { ok: false, error: "Dieser Channel ist bereits ein Trigger." };
  }

  revalidatePath("/dashboard/temp-channels");
  return { ok: true };
}

export async function removeTrigger(channelId: string): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.tempChannelTrigger.delete({ where: { channelId } }).catch(() => null);
  revalidatePath("/dashboard/temp-channels");
  return { ok: true };
}
