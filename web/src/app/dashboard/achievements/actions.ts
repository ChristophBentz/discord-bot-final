"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteAchievementImage, saveAchievementImage } from "@/lib/uploads";

export type Result = { ok: true } | { ok: false; error: string };

const VALID_TRIGGERS = ["manual", "level", "messages", "voice", "xp"] as const;

async function requireAuth(): Promise<Result | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

export async function createAchievement(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const triggerType = String(formData.get("triggerType") ?? "manual");
  const triggerValueRaw = String(formData.get("triggerValue") ?? "0");

  if (!name) return { ok: false, error: "Name darf nicht leer sein." };
  if (name.length > 80) return { ok: false, error: "Name max. 80 Zeichen." };
  if (!description) return { ok: false, error: "Beschreibung darf nicht leer sein." };
  if (description.length > 500) return { ok: false, error: "Beschreibung max. 500 Zeichen." };
  if (!(VALID_TRIGGERS as readonly string[]).includes(triggerType))
    return { ok: false, error: "Ungültiger Trigger-Typ." };

  const triggerValue =
    triggerType === "manual" ? 0 : Math.max(0, Math.floor(Number(triggerValueRaw) || 0));

  const file = formData.get("image");
  let imageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const saved = await saveAchievementImage(file);
    if (!saved.ok) return saved;
    imageUrl = saved.data.url;
  } else if (file instanceof File && file.name && file.size === 0) {
    return {
      ok: false,
      error:
        "Bild kam leer am Server an. Datei zu groß? Max 8 MB. Web-Server neu starten falls eben angepasst.",
    };
  }

  await prisma.achievement.create({
    data: { name, description, triggerType, triggerValue, imageUrl },
  });

  revalidatePath("/dashboard/achievements");
  return { ok: true };
}

export async function deleteAchievement(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const existing = await prisma.achievement.findUnique({ where: { id } });
  if (existing?.imageUrl) await deleteAchievementImage(existing.imageUrl);

  await prisma.achievement.delete({ where: { id } });

  revalidatePath("/dashboard/achievements");
  return { ok: true };
}

const SNOWFLAKE = /^\d{17,20}$/;

export async function saveNotifySettings(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const channelRaw = String(formData.get("achievementChannelId") ?? "").trim();
  if (channelRaw && !SNOWFLAKE.test(channelRaw)) {
    return { ok: false, error: "Channel-ID muss eine Discord-Snowflake sein (17–20 Ziffern)." };
  }
  const notifyDM = formData.get("achievementNotifyDM") === "on";
  const notifyChannel = formData.get("achievementNotifyChannel") === "on";

  await prisma.config.upsert({
    where: { id: 1 },
    update: {
      achievementNotifyDM: notifyDM,
      achievementNotifyChannel: notifyChannel,
      achievementChannelId: channelRaw === "" ? null : channelRaw,
    },
    create: {
      id: 1,
      achievementNotifyDM: notifyDM,
      achievementNotifyChannel: notifyChannel,
      achievementChannelId: channelRaw === "" ? null : channelRaw,
    },
  });

  revalidatePath("/dashboard/achievements");
  return { ok: true };
}
