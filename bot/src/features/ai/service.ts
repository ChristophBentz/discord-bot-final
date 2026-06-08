import { prisma, getConfig } from "@repo/db";
import { generateImage as minimaxGenerateImage } from "./providers/minimax.js";
import { chat as minimaxChat } from "./providers/minimax/chat.js";
import { generateSpeech as minimaxTts } from "./providers/minimax/tts.js";
import { generateMusic as minimaxMusic } from "./providers/minimax/music.js";
import { generateVideo as minimaxVideo } from "./providers/minimax/video.js";

type Cmd = "image" | "chat" | "tts" | "music" | "video";

interface ConfigForCmd {
  enabled: boolean;
  channelId: string | null;
  perUserPerDay: number;
  model: string;
  apiKey: string | null;
  baseUrl: string;
  groupId: string | null;
}

async function loadCmdConfig(cmd: Cmd): Promise<ConfigForCmd> {
  const c = await getConfig();
  switch (cmd) {
    case "image":
      return {
        enabled: c.aiEnabled,
        channelId: c.aiImageChannelId,
        perUserPerDay: c.aiImagesPerUserPerDay,
        model: c.aiImageModel,
        apiKey: c.aiApiKey,
        baseUrl: c.aiApiBaseUrl,
        groupId: c.aiGroupId,
      };
    case "chat":
      return {
        enabled: c.aiChatEnabled,
        channelId: c.aiChatChannelId,
        perUserPerDay: c.aiChatPerUserPerDay,
        model: c.aiChatModel,
        apiKey: c.aiApiKey,
        baseUrl: c.aiApiBaseUrl,
        groupId: c.aiGroupId,
      };
    case "tts":
      return {
        enabled: c.aiTtsEnabled,
        channelId: c.aiTtsChannelId,
        perUserPerDay: c.aiTtsPerUserPerDay,
        model: c.aiTtsModel,
        apiKey: c.aiApiKey,
        baseUrl: c.aiApiBaseUrl,
        groupId: c.aiGroupId,
      };
    case "music":
      return {
        enabled: c.aiMusicEnabled,
        channelId: c.aiMusicChannelId,
        perUserPerDay: c.aiMusicPerUserPerDay,
        model: c.aiMusicModel,
        apiKey: c.aiApiKey,
        baseUrl: c.aiApiBaseUrl,
        groupId: c.aiGroupId,
      };
    case "video":
      return {
        enabled: c.aiVideoEnabled,
        channelId: c.aiVideoChannelId,
        perUserPerDay: c.aiVideoPerUserPerDay,
        model: c.aiVideoModel,
        apiKey: c.aiApiKey,
        baseUrl: c.aiApiBaseUrl,
        groupId: c.aiGroupId,
      };
  }
}

interface GateResult {
  ok: boolean;
  error?: string;
  userError?: boolean;
  config?: ConfigForCmd;
  used?: number;
}

/** Check enabled + channel + api-key + rate-limit. Wird vor jedem Provider-Call benutzt. */
export async function gate(
  cmd: Cmd,
  userId: string,
  channelId: string,
): Promise<GateResult> {
  const cfg = await loadCmdConfig(cmd);
  if (!cfg.enabled) {
    return { ok: false, error: `Das ${cmd}-Feature ist deaktiviert.`, userError: true };
  }
  if (cfg.channelId && cfg.channelId !== channelId) {
    return {
      ok: false,
      error: `Bitte nutze diesen Command nur in <#${cfg.channelId}>.`,
      userError: true,
    };
  }
  if (!cfg.apiKey) {
    return { ok: false, error: "Kein API-Key konfiguriert (Dashboard → AI)." };
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiUsage.count({
    where: { userId, command: cmd, success: true, createdAt: { gte: since } },
  });
  if (used >= cfg.perUserPerDay) {
    return {
      ok: false,
      error: `Tageslimit erreicht (${cfg.perUserPerDay} ${cmd}/24h).`,
      userError: true,
    };
  }
  return { ok: true, config: cfg, used };
}

async function recordUsage(
  cmd: Cmd,
  userId: string,
  prompt: string,
  success: boolean,
  errorMsg?: string,
  imageUrl?: string,
) {
  await prisma.aiUsage.create({
    data: {
      userId,
      command: cmd,
      provider: "minimax",
      prompt: prompt.slice(0, 1000),
      success,
      errorMsg: errorMsg?.slice(0, 500),
      imageUrl,
    },
  });
}

// ─── Image ─────────────────────────────────────────────────────────────────

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
  const g = await gate("image", job.userId, job.channelId);
  if (!g.ok) return { ok: false, error: g.error!, userError: g.userError };
  const cfg = g.config!;
  const result = await minimaxGenerateImage({
    apiKey: cfg.apiKey!,
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    prompt: job.prompt,
    aspectRatio: job.aspectRatio,
    groupId: cfg.groupId ?? undefined,
  });
  if (!result.ok) {
    await recordUsage("image", job.userId, job.prompt, false, result.error);
    return { ok: false, error: result.error };
  }
  const imageUrl = result.imageUrls[0]!;
  let buffer: Buffer | undefined;
  try {
    const r = await fetch(imageUrl);
    if (r.ok) buffer = Buffer.from(await r.arrayBuffer());
  } catch {
    /* ignore */
  }
  await recordUsage("image", job.userId, job.prompt, true, undefined, imageUrl);
  return { ok: true, imageUrl, buffer };
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export async function runChatJob(job: {
  userId: string;
  channelId: string;
  prompt: string;
}): Promise<{ ok: true; text: string } | JobError> {
  const g = await gate("chat", job.userId, job.channelId);
  if (!g.ok) return { ok: false, error: g.error!, userError: g.userError };
  const cfg = g.config!;
  const result = await minimaxChat({
    apiKey: cfg.apiKey!,
    baseUrl: cfg.baseUrl,
    groupId: cfg.groupId,
    model: cfg.model,
    prompt: job.prompt,
  });
  if (!result.ok) {
    await recordUsage("chat", job.userId, job.prompt, false, result.error);
    return { ok: false, error: result.error! };
  }
  await recordUsage("chat", job.userId, job.prompt, true);
  return { ok: true, text: result.text! };
}

// ─── TTS ───────────────────────────────────────────────────────────────────

export async function runTtsJob(job: {
  userId: string;
  channelId: string;
  text: string;
  voiceId?: string;
}): Promise<{ ok: true; audio: Buffer } | JobError> {
  const g = await gate("tts", job.userId, job.channelId);
  if (!g.ok) return { ok: false, error: g.error!, userError: g.userError };
  const cfg = g.config!;
  const c = await getConfig();
  const result = await minimaxTts({
    apiKey: cfg.apiKey!,
    baseUrl: cfg.baseUrl,
    groupId: cfg.groupId,
    model: cfg.model,
    text: job.text,
    voiceId: job.voiceId ?? c.aiTtsVoiceId,
  });
  if (!result.ok) {
    await recordUsage("tts", job.userId, job.text, false, result.error);
    return { ok: false, error: result.error! };
  }
  await recordUsage("tts", job.userId, job.text, true);
  return { ok: true, audio: result.audio! };
}

// ─── Music ─────────────────────────────────────────────────────────────────

export async function runMusicJob(job: {
  userId: string;
  channelId: string;
  prompt: string;
}): Promise<{ ok: true; audio: Buffer } | JobError> {
  const g = await gate("music", job.userId, job.channelId);
  if (!g.ok) return { ok: false, error: g.error!, userError: g.userError };
  const cfg = g.config!;
  const result = await minimaxMusic({
    apiKey: cfg.apiKey!,
    baseUrl: cfg.baseUrl,
    groupId: cfg.groupId,
    model: cfg.model,
    lyrics: job.prompt,
  });
  if (!result.ok) {
    await recordUsage("music", job.userId, job.prompt, false, result.error);
    return { ok: false, error: result.error! };
  }
  await recordUsage("music", job.userId, job.prompt, true);
  return { ok: true, audio: result.audio! };
}

// ─── Video ─────────────────────────────────────────────────────────────────

export async function runVideoJob(job: {
  userId: string;
  channelId: string;
  prompt: string;
}): Promise<{ ok: true; videoUrl: string; video?: Buffer } | JobError> {
  const g = await gate("video", job.userId, job.channelId);
  if (!g.ok) return { ok: false, error: g.error!, userError: g.userError };
  const cfg = g.config!;
  const result = await minimaxVideo({
    apiKey: cfg.apiKey!,
    baseUrl: cfg.baseUrl,
    groupId: cfg.groupId,
    model: cfg.model,
    prompt: job.prompt,
  });
  if (!result.ok) {
    await recordUsage("video", job.userId, job.prompt, false, result.error);
    return { ok: false, error: result.error! };
  }
  await recordUsage("video", job.userId, job.prompt, true, undefined, result.videoUrl);
  return { ok: true, videoUrl: result.videoUrl!, video: result.video };
}

// ─── Quota-Helper für Commands ─────────────────────────────────────────────

export async function getRemainingQuota(
  cmd: Cmd,
  userId: string,
): Promise<{ used: number; limit: number; remaining: number }> {
  const cfg = await loadCmdConfig(cmd);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiUsage.count({
    where: { userId, command: cmd, success: true, createdAt: { gte: since } },
  });
  return {
    used,
    limit: cfg.perUserPerDay,
    remaining: Math.max(0, cfg.perUserPerDay - used),
  };
}
