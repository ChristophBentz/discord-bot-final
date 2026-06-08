"use server";

import { getConfig, prisma } from "@repo/db";
import { revalidatePath } from "next/cache";

export interface AiSettings {
  // Provider (shared)
  aiProvider: string;
  aiApiKey: string;
  aiGroupId: string;
  aiApiBaseUrl: string;

  // Image
  aiEnabled: boolean;
  aiImageChannelId: string;
  aiImagesPerUserPerDay: number;
  aiImageModel: string;

  // Chat
  aiChatEnabled: boolean;
  aiChatChannelId: string;
  aiChatPerUserPerDay: number;
  aiChatModel: string;

  // TTS
  aiTtsEnabled: boolean;
  aiTtsChannelId: string;
  aiTtsPerUserPerDay: number;
  aiTtsModel: string;
  aiTtsVoiceId: string;

  // Music
  aiMusicEnabled: boolean;
  aiMusicChannelId: string;
  aiMusicPerUserPerDay: number;
  aiMusicModel: string;

  // Video
  aiVideoEnabled: boolean;
  aiVideoChannelId: string;
  aiVideoPerUserPerDay: number;
  aiVideoModel: string;
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.floor(n) || 0));

export async function saveAiSettings(form: AiSettings): Promise<{ ok: boolean; error?: string }> {
  const apiKey = form.aiApiKey.trim();
  const baseUrl = form.aiApiBaseUrl.trim().replace(/\/+$/, "") || "https://api.minimaxi.com";

  const anyEnabled =
    form.aiEnabled ||
    form.aiChatEnabled ||
    form.aiTtsEnabled ||
    form.aiMusicEnabled ||
    form.aiVideoEnabled;

  if (anyEnabled && !apiKey) {
    return { ok: false, error: "API-Key wird benötigt wenn mindestens ein Feature aktiv ist." };
  }

  await prisma.config.update({
    where: { id: 1 },
    data: {
      aiProvider: "minimax",
      aiApiKey: apiKey || null,
      aiGroupId: form.aiGroupId.trim() || null,
      aiApiBaseUrl: baseUrl,

      aiEnabled: !!form.aiEnabled,
      aiImageChannelId: form.aiImageChannelId.trim() || null,
      aiImagesPerUserPerDay: clamp(form.aiImagesPerUserPerDay, 0, 1000),
      aiImageModel: form.aiImageModel.trim() || "image-01",

      aiChatEnabled: !!form.aiChatEnabled,
      aiChatChannelId: form.aiChatChannelId.trim() || null,
      aiChatPerUserPerDay: clamp(form.aiChatPerUserPerDay, 0, 1000),
      aiChatModel: form.aiChatModel.trim() || "MiniMax-Text-01",

      aiTtsEnabled: !!form.aiTtsEnabled,
      aiTtsChannelId: form.aiTtsChannelId.trim() || null,
      aiTtsPerUserPerDay: clamp(form.aiTtsPerUserPerDay, 0, 1000),
      aiTtsModel: form.aiTtsModel.trim() || "speech-02-hd",
      aiTtsVoiceId: form.aiTtsVoiceId.trim() || "German_PlayfulMan",

      aiMusicEnabled: !!form.aiMusicEnabled,
      aiMusicChannelId: form.aiMusicChannelId.trim() || null,
      aiMusicPerUserPerDay: clamp(form.aiMusicPerUserPerDay, 0, 1000),
      aiMusicModel: form.aiMusicModel.trim() || "music-1.5",

      aiVideoEnabled: !!form.aiVideoEnabled,
      aiVideoChannelId: form.aiVideoChannelId.trim() || null,
      aiVideoPerUserPerDay: clamp(form.aiVideoPerUserPerDay, 0, 100),
      aiVideoModel: form.aiVideoModel.trim() || "T2V-01",
    },
  });

  revalidatePath("/dashboard/ai");
  return { ok: true };
}

export async function testAiConnection(): Promise<{
  ok: boolean;
  error?: string;
  imageUrl?: string;
}> {
  const cfg = await getConfig();
  if (!cfg.aiApiKey) return { ok: false, error: "Bitte erst API-Key speichern." };

  const groupQuery = cfg.aiGroupId?.trim()
    ? `?GroupId=${encodeURIComponent(cfg.aiGroupId.trim())}`
    : "";
  const endpoint = `${cfg.aiApiBaseUrl.replace(/\/+$/, "")}/v1/image_generation${groupQuery}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.aiApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.aiImageModel,
        prompt: "a small red circle on white background",
        aspect_ratio: "1:1",
        response_format: "url",
        n: 1,
      }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} — ${text.slice(0, 300)}` };
    const json = JSON.parse(text) as {
      base_resp?: { status_code: number; status_msg: string };
      data?: { image_urls?: string[] };
    };
    if (json.base_resp && json.base_resp.status_code !== 0) {
      return {
        ok: false,
        error: `${json.base_resp.status_msg} (Code ${json.base_resp.status_code})`,
      };
    }
    return { ok: true, imageUrl: json.data?.image_urls?.[0] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Netzwerk-Fehler" };
  }
}

export async function getAiStats(): Promise<{
  totalImages: number;
  totals: Record<string, number>;
  last24h: Record<string, number>;
}> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const grouped = await prisma.aiUsage.groupBy({
    by: ["command"],
    where: { success: true },
    _count: { _all: true },
  });

  const grouped24h = await prisma.aiUsage.groupBy({
    by: ["command"],
    where: { success: true, createdAt: { gte: since24h } },
    _count: { _all: true },
  });

  const totals: Record<string, number> = {};
  for (const g of grouped) totals[g.command] = g._count._all;
  const last24h: Record<string, number> = {};
  for (const g of grouped24h) last24h[g.command] = g._count._all;

  return {
    totalImages: totals.image ?? 0,
    totals,
    last24h,
  };
}

export { getConfig };
