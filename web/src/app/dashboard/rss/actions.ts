"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type Result = { ok: true } | { ok: false; error: string };

async function requireAuth(): Promise<{ ok: false; error: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

interface FeedInput {
  name: string;
  url: string;
  channelId: string;
  pingRoleId: string | null;
  intervalMin: number;
  enabled: boolean;
}

function parseInput(formData: FormData): { ok: true; data: FeedInput } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const channelId = String(formData.get("channelId") ?? "").trim();
  const pingRoleId = String(formData.get("pingRoleId") ?? "").trim() || null;
  const intervalMinRaw = Number(formData.get("intervalMin") ?? 15);
  const enabled = formData.get("enabled") === "on";

  if (!name) return { ok: false, error: "Name ist erforderlich." };
  if (name.length > 80) return { ok: false, error: "Name max. 80 Zeichen." };
  if (!url) return { ok: false, error: "URL ist erforderlich." };
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "URL muss http(s) sein." };
    }
  } catch {
    return { ok: false, error: "Ungültige URL." };
  }
  if (!/^\d{17,20}$/.test(channelId)) {
    return { ok: false, error: "Ungültige Channel-ID." };
  }
  if (pingRoleId && !/^\d{17,20}$/.test(pingRoleId)) {
    return { ok: false, error: "Ungültige Rollen-ID." };
  }
  const intervalMin = Math.max(5, Math.min(360, Math.round(intervalMinRaw)));
  return { ok: true, data: { name, url, channelId, pingRoleId, intervalMin, enabled } };
}

export async function createFeed(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const parsed = parseInput(formData);
  if (!parsed.ok) return parsed;

  await prisma.rssFeed.create({ data: parsed.data });
  revalidatePath("/dashboard/rss");
  return { ok: true };
}

export async function updateFeed(id: number, formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const parsed = parseInput(formData);
  if (!parsed.ok) return parsed;

  const existing = await prisma.rssFeed.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Feed nicht gefunden." };

  // URL-Wechsel → History resetten, damit alter Dedup-Speicher nicht den neuen Feed blockiert.
  const urlChanged = existing.url !== parsed.data.url;
  await prisma.$transaction([
    prisma.rssFeed.update({ where: { id }, data: parsed.data }),
    ...(urlChanged ? [prisma.rssFeedItem.deleteMany({ where: { feedId: id } })] : []),
  ]);
  revalidatePath("/dashboard/rss");
  return { ok: true };
}

export async function toggleFeed(id: number, enabled: boolean): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.rssFeed.update({ where: { id }, data: { enabled } });
  revalidatePath("/dashboard/rss");
  return { ok: true };
}

export async function deleteFeed(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.rssFeed.delete({ where: { id } }).catch(() => null);
  revalidatePath("/dashboard/rss");
  return { ok: true };
}

export async function checkFeedNow(
  id: number,
): Promise<
  | { ok: true; posted: number; skipped: number; fetched: number; initial: boolean }
  | { ok: false; error: string }
> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot<{
    posted: number;
    skipped: number;
    fetched: number;
    initial: boolean;
  }>(`/api/rss/feeds/${id}/check`, { method: "POST" });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/rss");
  return {
    ok: true,
    posted: r.data.posted,
    skipped: r.data.skipped,
    fetched: r.data.fetched,
    initial: r.data.initial,
  };
}

export interface TestPreview {
  title: string | null;
  link: string | null;
  itemCount: number;
  sample: {
    title: string;
    link: string | null;
    description: string | null;
    imageUrl: string | null;
    pubDate: string | null;
  } | null;
}

export async function testUrl(
  url: string,
): Promise<{ ok: true; preview: TestPreview } | { ok: false; error: string }> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot<TestPreview>("/api/rss/test", { method: "POST", body: { url } });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, preview: r.data };
}
