"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";
import { prisma } from "@repo/db";

export type Result = { ok: true } | { ok: false; error: string };

async function getMod(): Promise<{ id: string; name: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as { discordId?: string }).discordId ?? "dashboard",
    name: session.user.name ?? "Staff",
  };
}

export async function unbanMember(userId: string, reason: string): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };
  const res = await callBot(`/api/members/${userId}/ban`, {
    method: "DELETE",
    body: { reason, moderatorId: mod.id, moderatorName: mod.name },
  });
  if (!res.ok) return res;
  revalidatePath("/dashboard/moderation");
  return { ok: true };
}

export async function removeTimeout(userId: string, reason: string): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };
  const res = await callBot(`/api/members/${userId}/timeout`, {
    method: "DELETE",
    body: { reason, moderatorId: mod.id, moderatorName: mod.name },
  });
  if (!res.ok) return res;
  revalidatePath("/dashboard/moderation");
  revalidatePath(`/dashboard/members/${userId}`);
  return { ok: true };
}

export async function deleteWarning(id: number): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };
  const warning = await prisma.warning.findUnique({ where: { id } });
  if (!warning) return { ok: false, error: "Verwarnung nicht gefunden." };
  await prisma.warning.delete({ where: { id } });
  revalidatePath("/dashboard/moderation");
  revalidatePath(`/dashboard/members/${warning.userId}`);
  return { ok: true };
}

// ─── Ban-Appeals ─────────────────────────────────────────────────────────────

export async function approveAppeal(id: number, note: string): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };
  const appeal = await prisma.banAppeal.findUnique({ where: { id } });
  if (!appeal) return { ok: false, error: "Antrag nicht gefunden." };
  if (appeal.status !== "pending") return { ok: false, error: "Antrag ist bereits entschieden." };

  const res = await callBot(`/api/members/${appeal.userId}/ban`, {
    method: "DELETE",
    body: {
      reason: "Entbannungsantrag angenommen",
      moderatorId: mod.id,
      moderatorName: mod.name,
    },
  });
  // "nicht gebannt" = wurde schon manuell entbannt — Antrag trotzdem annehmen.
  if (!res.ok && !res.error.includes("nicht gebannt")) return res;

  await prisma.banAppeal.update({
    where: { id },
    data: {
      status: "approved",
      decidedById: mod.id,
      decidedBy: mod.name,
      decidedAt: new Date(),
      decisionNote: note.trim() || null,
    },
  });
  revalidatePath("/dashboard/moderation");
  revalidatePath(`/appeal/${appeal.userId}`);
  return { ok: true };
}

export async function denyAppeal(id: number, note: string): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };
  const appeal = await prisma.banAppeal.findUnique({ where: { id } });
  if (!appeal) return { ok: false, error: "Antrag nicht gefunden." };
  if (appeal.status !== "pending") return { ok: false, error: "Antrag ist bereits entschieden." };

  await prisma.banAppeal.update({
    where: { id },
    data: {
      status: "denied",
      decidedById: mod.id,
      decidedBy: mod.name,
      decidedAt: new Date(),
      decisionNote: note.trim() || null,
    },
  });
  revalidatePath("/dashboard/moderation");
  revalidatePath(`/appeal/${appeal.userId}`);
  return { ok: true };
}

// Löschen erlaubt dem User, erneut einen Antrag zu stellen (Eskalations-Ventil).
export async function deleteAppeal(id: number): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };
  const appeal = await prisma.banAppeal.findUnique({ where: { id } });
  if (!appeal) return { ok: false, error: "Antrag nicht gefunden." };
  await prisma.banAppeal.delete({ where: { id } });
  revalidatePath("/dashboard/moderation");
  revalidatePath(`/appeal/${appeal.userId}`);
  return { ok: true };
}
