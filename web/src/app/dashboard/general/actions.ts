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

export type SaveDescriptionResult =
  | { ok: true; description: string }
  | { ok: false; error: string };

export async function saveBotDescription(formData: FormData): Promise<SaveDescriptionResult> {
  const raw = String(formData.get("botDescription") ?? "").trim();
  if (raw.length > 400) {
    return { ok: false, error: "Maximal 400 Zeichen erlaubt." };
  }
  const r = await callBot<{ description: string }>("/api/bot/description", {
    method: "POST",
    body: { description: raw },
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, description: r.data.description };
}

export async function loadBotDescription(): Promise<string> {
  const r = await callBot<{ description: string }>("/api/bot/description", { method: "GET" });
  return r.ok ? r.data.description : "";
}

export type SaveAvatarResult =
  | { ok: true; avatarUrl: string | null }
  | { ok: false; error: string };

export async function saveBotAvatar(dataUrl: string | null): Promise<SaveAvatarResult> {
  if (dataUrl && !dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Ungültiges Datei-Format." };
  }
  if (dataUrl && dataUrl.length > 11_000_000) {
    return { ok: false, error: "Datei zu groß (max. 8 MB)." };
  }
  const r = await callBot<{ avatarUrl: string | null }>("/api/bot/avatar", {
    method: "POST",
    body: { dataUrl: dataUrl ?? "" },
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/general");
  return { ok: true, avatarUrl: r.data.avatarUrl };
}

export type SaveBannerResult =
  | { ok: true; bannerUrl: string | null }
  | { ok: false; error: string };

export async function saveBotBanner(dataUrl: string | null): Promise<SaveBannerResult> {
  if (dataUrl && !dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Ungültiges Datei-Format." };
  }
  // Banner-Limit: 10 MB roh ≈ 14 MB als base64
  if (dataUrl && dataUrl.length > 14_000_000) {
    return { ok: false, error: "Datei zu groß (max. 10 MB)." };
  }
  const r = await callBot<{ bannerUrl: string | null }>("/api/bot/banner", {
    method: "POST",
    body: { dataUrl: dataUrl ?? "" },
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/general");
  return { ok: true, bannerUrl: r.data.bannerUrl };
}
