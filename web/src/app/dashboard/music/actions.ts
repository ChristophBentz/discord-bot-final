"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type Result = { ok: true } | { ok: false; error: string };

const SNOWFLAKE = /^\d{17,20}$/;

async function requireAuth(): Promise<Result | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

async function discordId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
}

export async function saveMusicSettings(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const enabled = formData.get("musicEnabled") === "on";
  await prisma.config.upsert({
    where: { id: 1 },
    update: { musicEnabled: enabled },
    create: { id: 1, musicEnabled: enabled },
  });
  revalidatePath("/dashboard/music");
  return { ok: true };
}

export async function addDjRole(roleId: string): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  if (!SNOWFLAKE.test(roleId)) return { ok: false, error: "Rollen-ID ungültig." };
  const addedBy = await discordId();
  try {
    await prisma.musicRole.create({ data: { roleId, addedBy } });
  } catch {
    return { ok: false, error: "Diese Rolle ist bereits DJ." };
  }
  revalidatePath("/dashboard/music");
  return { ok: true };
}

export async function removeDjRole(roleId: string): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.musicRole.delete({ where: { roleId } }).catch(() => null);
  revalidatePath("/dashboard/music");
  return { ok: true };
}

export async function musicPlay(query: string): Promise<Result> {
  const userId = await discordId();
  if (!userId) return { ok: false, error: "Nicht eingeloggt." };
  if (!query.trim()) return { ok: false, error: "Bitte einen Link oder Suchbegriff angeben." };
  const r = await callBot<{ ok: true }>("/api/music/play", {
    method: "POST",
    body: { query, userId },
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

async function action(path: string): Promise<Result> {
  const userId = await discordId();
  if (!userId) return { ok: false, error: "Nicht eingeloggt." };
  const r = await callBot<{ ok: true }>(path, { method: "POST", body: { userId } });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function musicVolume(percent: number): Promise<Result> {
  const userId = await discordId();
  if (!userId) return { ok: false, error: "Nicht eingeloggt." };
  const r = await callBot<{ ok: true }>("/api/music/volume", {
    method: "POST",
    body: { userId, percent },
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function musicSkip(): Promise<Result> {
  return action("/api/music/skip");
}
export async function musicPause(): Promise<Result> {
  return action("/api/music/pause");
}
export async function musicResume(): Promise<Result> {
  return action("/api/music/resume");
}
export async function musicStop(): Promise<Result> {
  return action("/api/music/stop");
}
