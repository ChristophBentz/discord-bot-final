import { prisma, getConfig } from "@repo/db";
import { generateImage as minimaxGenerateImage } from "./providers/minimax.js";

export interface ImageJob {
  userId: string;
  channelId: string;
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";
}

export interface ImageJobResult {
  ok: true;
  imageUrl: string;
  buffer?: Buffer;
}

export interface JobError {
  ok: false;
  error: string;
  userError?: boolean;
}

export async function runImageJob(
  job: ImageJob,
): Promise<ImageJobResult | JobError> {
  const c = await getConfig();

  if (!c.aiEnabled) {
    return { ok: false, error: "AI-Features sind nicht aktiviert.", userError: true };
  }
  if (c.aiImageChannelId && c.aiImageChannelId !== job.channelId) {
    return {
      ok: false,
      error: `Bitte nutze /image nur in <#${c.aiImageChannelId}>.`,
      userError: true,
    };
  }
  if (!c.aiApiKey) {
    return { ok: false, error: "Kein API-Key konfiguriert (Dashboard → AI)." };
  }

  // Rate-Limit (24h-Fenster)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiUsage.count({
    where: { userId: job.userId, command: "image", success: true, createdAt: { gte: since } },
  });
  if (used >= c.aiImagesPerUserPerDay) {
    return {
      ok: false,
      error: `Tageslimit erreicht (${c.aiImagesPerUserPerDay} Bilder / 24h).`,
      userError: true,
    };
  }

  const result = await minimaxGenerateImage({
    apiKey: c.aiApiKey,
    baseUrl: c.aiApiBaseUrl,
    model: c.aiImageModel,
    prompt: job.prompt,
    aspectRatio: job.aspectRatio,
    groupId: c.aiGroupId ?? undefined,
  });

  if (!result.ok) {
    await prisma.aiUsage.create({
      data: {
        userId: job.userId,
        command: "image",
        provider: "minimax",
        prompt: job.prompt.slice(0, 1000),
        success: false,
        errorMsg: result.error.slice(0, 500),
      },
    });
    return { ok: false, error: result.error };
  }

  const imageUrl = result.imageUrls[0]!;
  let buffer: Buffer | undefined;
  try {
    const r = await fetch(imageUrl);
    if (r.ok) buffer = Buffer.from(await r.arrayBuffer());
  } catch {
    /* fallback auf URL only */
  }

  await prisma.aiUsage.create({
    data: {
      userId: job.userId,
      command: "image",
      provider: "minimax",
      prompt: job.prompt.slice(0, 1000),
      success: true,
      imageUrl,
    },
  });

  return { ok: true, imageUrl, buffer };
}

export async function getRemainingQuota(
  _cmd: "image",
  userId: string,
): Promise<{ used: number; limit: number; remaining: number }> {
  const c = await getConfig();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiUsage.count({
    where: { userId, command: "image", success: true, createdAt: { gte: since } },
  });
  return {
    used,
    limit: c.aiImagesPerUserPerDay,
    remaining: Math.max(0, c.aiImagesPerUserPerDay - used),
  };
}
