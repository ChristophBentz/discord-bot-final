"use server";

import { getConfig, prisma } from "@repo/db";
import { revalidatePath } from "next/cache";

export interface AiSettings {
  aiEnabled: boolean;
  aiProvider: string;
  aiApiKey: string;
  aiGroupId: string;
  aiImageChannelId: string;
  aiImagesPerUserPerDay: number;
  aiImageModel: string;
}

export async function saveAiSettings(form: AiSettings): Promise<{ ok: boolean; error?: string }> {
  // API-Key trimmen + leere Strings als NULL speichern damit "" nicht versehentlich gespeichert wird
  const apiKey = form.aiApiKey.trim();
  const groupId = form.aiGroupId.trim();
  const channelId = form.aiImageChannelId.trim();
  const provider = form.aiProvider === "minimax" ? "minimax" : "minimax"; // erweiterbar
  const limit = Math.max(0, Math.min(1000, Math.floor(form.aiImagesPerUserPerDay) || 5));
  const model = form.aiImageModel.trim() || "image-01";

  if (form.aiEnabled && !apiKey) {
    return { ok: false, error: "API-Key wird benötigt wenn AI aktiviert ist." };
  }

  await prisma.config.update({
    where: { id: 1 },
    data: {
      aiEnabled: !!form.aiEnabled,
      aiProvider: provider,
      aiApiKey: apiKey || null,
      aiGroupId: groupId || null,
      aiImageChannelId: channelId || null,
      aiImagesPerUserPerDay: limit,
      aiImageModel: model,
    },
  });

  revalidatePath("/dashboard/ai");
  return { ok: true };
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
