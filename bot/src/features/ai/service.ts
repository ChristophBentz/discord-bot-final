import { prisma, getConfig } from "@repo/db";
import { generateImage as minimaxGenerate } from "./providers/minimax.js";

export interface ImageJob {
  userId: string;
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";
}

export interface ImageJobResult {
  ok: true;
  imageUrl: string;
  buffer?: Buffer;
}

export interface ImageJobError {
  ok: false;
  error: string;
  /** true wenn das ein "User-Error" ist (kein Logging als Bot-Error) */
  userError?: boolean;
}

/** Prüft Limits + Channel + ruft Provider auf + speichert Usage. */
export async function runImageJob(
  job: ImageJob,
): Promise<ImageJobResult | ImageJobError> {
  const config = await getConfig();

  if (!config.aiEnabled) {
    return { ok: false, error: "AI-Features sind nicht aktiviert.", userError: true };
  }
  if (!config.aiApiKey) {
    return {
      ok: false,
      error: "Kein API-Key konfiguriert. Bitte im Dashboard unter AI eintragen.",
    };
  }

  // Rate-Limit: Anzahl Generierungen in den letzten 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const usedToday = await prisma.aiUsage.count({
    where: {
      userId: job.userId,
      command: "image",
      success: true,
      createdAt: { gte: since },
    },
  });
  if (usedToday >= config.aiImagesPerUserPerDay) {
    return {
      ok: false,
      error: `Du hast dein Tageslimit erreicht (${config.aiImagesPerUserPerDay} Bilder / 24h). Versuch's morgen wieder.`,
      userError: true,
    };
  }

  // Provider aufrufen
  let result: { ok: true; imageUrls: string[] } | { ok: false; error: string };
  if (config.aiProvider === "minimax") {
    result = await minimaxGenerate({
      apiKey: config.aiApiKey,
      baseUrl: config.aiApiBaseUrl,
      model: config.aiImageModel,
      prompt: job.prompt,
      aspectRatio: job.aspectRatio,
      groupId: config.aiGroupId ?? undefined,
    });
  } else {
    return {
      ok: false,
      error: `Provider '${config.aiProvider}' ist noch nicht implementiert.`,
    };
  }

  if (!result.ok) {
    // Failed-Usage trotzdem aufzeichnen
    await prisma.aiUsage.create({
      data: {
        userId: job.userId,
        command: "image",
        provider: config.aiProvider,
        prompt: job.prompt.slice(0, 1000),
        success: false,
        errorMsg: result.error.slice(0, 500),
      },
    });
    return { ok: false, error: result.error };
  }

  const imageUrl = result.imageUrls[0]!;

  // Bild downloaden für Discord-Attachment (MiniMax-URLs sind kurzlebig)
  let buffer: Buffer | undefined;
  try {
    const res = await fetch(imageUrl);
    if (res.ok) {
      buffer = Buffer.from(await res.arrayBuffer());
    }
  } catch {
    /* fallback: nur URL posten */
  }

  // Erfolgreiche Generierung tracken
  await prisma.aiUsage.create({
    data: {
      userId: job.userId,
      command: "image",
      provider: config.aiProvider,
      prompt: job.prompt.slice(0, 1000),
      imageUrl,
      success: true,
    },
  });

  return { ok: true, imageUrl, buffer };
}

/** Returns wie viele Generierungen der User in den letzten 24h gemacht hat. */
export async function getRemainingQuota(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const config = await getConfig();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiUsage.count({
    where: {
      userId,
      command: "image",
      success: true,
      createdAt: { gte: since },
    },
  });
  return {
    used,
    limit: config.aiImagesPerUserPerDay,
    remaining: Math.max(0, config.aiImagesPerUserPerDay - used),
  };
}
