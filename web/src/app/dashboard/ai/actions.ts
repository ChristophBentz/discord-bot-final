"use server";

import { getConfig, prisma } from "@repo/db";
import { revalidatePath } from "next/cache";

export interface AiSettings {
  aiEnabled: boolean;
  aiProvider: string;
  aiApiKey: string;
  aiGroupId: string;
  aiApiBaseUrl: string;
  aiImageChannelId: string;
  aiImagesPerUserPerDay: number;
  aiImageModel: string;
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.floor(n) || 0));

export async function saveAiSettings(
  form: AiSettings,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = form.aiApiKey.trim();
  const baseUrl =
    form.aiApiBaseUrl.trim().replace(/\/+$/, "") || "https://api.minimaxi.com";

  if (form.aiEnabled && !apiKey) {
    return { ok: false, error: "API-Key wird benötigt wenn AI aktiviert ist." };
  }

  await prisma.config.update({
    where: { id: 1 },
    data: {
      aiEnabled: !!form.aiEnabled,
      aiProvider: "minimax",
      aiApiKey: apiKey || null,
      aiGroupId: form.aiGroupId.trim() || null,
      aiApiBaseUrl: baseUrl,
      aiImageChannelId: form.aiImageChannelId.trim() || null,
      aiImagesPerUserPerDay: clamp(form.aiImagesPerUserPerDay, 0, 1000),
      aiImageModel: form.aiImageModel.trim() || "image-01",
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
  imagesLast24h: number;
  imagesLast30d: number;
  topUsers: { userId: string; displayName: string | null; count: number }[];
}> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalImages, imagesLast24h, imagesLast30d, grouped] = await Promise.all([
    prisma.aiUsage.count({ where: { command: "image", success: true } }),
    prisma.aiUsage.count({
      where: { command: "image", success: true, createdAt: { gte: since24h } },
    }),
    prisma.aiUsage.count({
      where: { command: "image", success: true, createdAt: { gte: since30d } },
    }),
    prisma.aiUsage.groupBy({
      by: ["userId"],
      where: { command: "image", success: true, createdAt: { gte: since30d } },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 5,
    }),
  ]);

  const userIds = grouped.map((g) => g.userId);
  const members = await prisma.member.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, displayName: true },
  });
  const memberMap = new Map(members.map((m) => [m.userId, m.displayName]));

  return {
    totalImages,
    imagesLast24h,
    imagesLast30d,
    topUsers: grouped.map((g) => ({
      userId: g.userId,
      displayName: memberMap.get(g.userId) ?? null,
      count: g._count._all,
    })),
  };
}

export { getConfig };
