"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type StatType = "totalMembers" | "humanMembers" | "onlineMembers";
const VALID_TYPES: StatType[] = ["totalMembers", "humanMembers", "onlineMembers"];

export type Result = { ok: true } | { ok: false; error: string };

async function requireAuth(): Promise<{ ok: false; error: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

export async function saveSettings(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const enabled = formData.get("serverStatsEnabled") === "on";
  const categoryId = String(formData.get("serverStatsCategoryId") ?? "").trim() || null;
  const updateMinutesRaw = Number(formData.get("serverStatsUpdateMinutes") ?? 10);
  const updateMinutes = Math.max(1, Math.min(120, Math.round(updateMinutesRaw)));

  if (enabled && !categoryId) {
    return { ok: false, error: "Bitte eine Kategorie auswählen, wenn das Feature aktiv ist." };
  }
  if (categoryId && !/^\d{17,20}$/.test(categoryId)) {
    return { ok: false, error: "Ungültige Kategorie-ID." };
  }

  await prisma.config.upsert({
    where: { id: 1 },
    update: {
      serverStatsEnabled: enabled,
      serverStatsCategoryId: categoryId,
      serverStatsUpdateMinutes: updateMinutes,
    },
    create: {
      id: 1,
      serverStatsEnabled: enabled,
      serverStatsCategoryId: categoryId,
      serverStatsUpdateMinutes: updateMinutes,
    },
  });
  // Bot kann sofort die Channels anlegen
  await callBot<unknown>("/api/serverstats/ensure", { method: "POST" });
  revalidatePath("/dashboard/server-stats");
  return { ok: true };
}

export async function createStat(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const type = String(formData.get("type") ?? "");
  const nameTemplate = String(formData.get("nameTemplate") ?? "").trim();

  if (!VALID_TYPES.includes(type as StatType)) {
    return { ok: false, error: "Ungültiger Stat-Typ." };
  }
  if (!nameTemplate) return { ok: false, error: "Channel-Name darf nicht leer sein." };
  if (nameTemplate.length > 100) return { ok: false, error: "Max. 100 Zeichen." };
  if (!nameTemplate.includes("{count}")) {
    return { ok: false, error: "Template muss den Platzhalter {count} enthalten." };
  }

  const existing = await prisma.serverStat.count();
  await prisma.serverStat.create({
    data: { type, nameTemplate, position: existing },
  });
  await callBot<unknown>("/api/serverstats/ensure", { method: "POST" });
  revalidatePath("/dashboard/server-stats");
  return { ok: true };
}

export async function updateStat(id: number, formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const nameTemplate = String(formData.get("nameTemplate") ?? "").trim();
  if (!nameTemplate) return { ok: false, error: "Channel-Name darf nicht leer sein." };
  if (nameTemplate.length > 100) return { ok: false, error: "Max. 100 Zeichen." };
  if (!nameTemplate.includes("{count}")) {
    return { ok: false, error: "Template muss den Platzhalter {count} enthalten." };
  }

  await prisma.serverStat.update({
    where: { id },
    data: { nameTemplate, lastValue: null }, // → erzwingt Update beim nächsten Tick
  });
  await callBot<unknown>("/api/serverstats/update", { method: "POST" });
  revalidatePath("/dashboard/server-stats");
  return { ok: true };
}

export async function toggleStat(id: number, enabled: boolean): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.serverStat.update({ where: { id }, data: { enabled } });
  await callBot<unknown>("/api/serverstats/ensure", { method: "POST" });
  revalidatePath("/dashboard/server-stats");
  return { ok: true };
}

export async function deleteStat(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  // Setzt enabled=false → ensure löscht den Channel, dann Eintrag löschen
  await prisma.serverStat.update({ where: { id }, data: { enabled: false } });
  await callBot<unknown>("/api/serverstats/ensure", { method: "POST" });
  await prisma.serverStat.delete({ where: { id } }).catch(() => null);
  revalidatePath("/dashboard/server-stats");
  return { ok: true };
}

export interface DiagnoseData {
  guildId: string | null;
  memberCount: number;
  membersCached: number;
  presencesCached: number;
  presencesNonOffline: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryExists: boolean;
  lastTickAt: string | null;
  rows: {
    id: number;
    type: string;
    enabled: boolean;
    channelId: string | null;
    computedValue: number | null;
    expectedName: string | null;
    actualName: string | null;
    matches: boolean | null;
    channelExists: boolean;
    status: "ok" | "no_channel_id" | "channel_missing" | "wrong_type";
  }[];
}

export async function resetAndRecreate(): Promise<
  { ok: true; recreated: number } | { ok: false; error: string }
> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot<{ recreated: number }>("/api/serverstats/reset", { method: "POST" });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/server-stats");
  return { ok: true, recreated: r.data.recreated };
}

export async function runDiagnose(): Promise<
  { ok: true; data: DiagnoseData } | { ok: false; error: string }
> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot<{ data: DiagnoseData }>("/api/serverstats/diagnose", { method: "GET" });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, data: r.data.data };
}

export async function updateNow(): Promise<
  | { ok: true; renamed: number; unchanged: number; failed: number; rateLimited: number }
  | { ok: false; error: string }
> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot<{
    renamed: number;
    unchanged: number;
    failed: number;
    rateLimited: number;
  }>("/api/serverstats/update", { method: "POST" });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/server-stats");
  return {
    ok: true,
    renamed: r.data.renamed,
    unchanged: r.data.unchanged,
    failed: r.data.failed,
    rateLimited: r.data.rateLimited,
  };
}
