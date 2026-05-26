"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

const NAME_RE = /^[a-z0-9_-]{1,32}$/;

export interface CommandFormState {
  name: string;
  description: string;
  responseType: "text" | "embed";
  response: string;
  embedTitle: string;
  embedDescription: string;
  embedColor: string; // hex
  embedImageUrl: string;
  embedFooter: string;
  ephemeral: boolean;
  allowedRoleIds: string[];
}

function hexToInt(hex: string): number | null {
  const cleaned = hex.replace(/^#/, "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return parseInt(cleaned, 16);
}

async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  return ((session?.user as { discordId?: string } | undefined)?.discordId) ?? "unknown";
}

async function triggerSync() {
  const res = await callBot<{ builtIn: number; custom: number }>("/api/commands/sync", {
    method: "POST",
  });
  return res;
}

export async function saveCommand(form: CommandFormState, originalName?: string): Promise<{ ok: boolean; error?: string }> {
  const name = form.name.toLowerCase().trim();
  if (!NAME_RE.test(name)) {
    return { ok: false, error: "Name: nur a-z, 0-9, _ und -, max 32 Zeichen." };
  }
  const description = form.description.trim().slice(0, 100) || "Custom-Command";
  const responseType = form.responseType === "embed" ? "embed" : "text";

  const data = {
    name,
    description,
    responseType,
    response: form.response.slice(0, 2000),
    embedTitle: form.embedTitle.trim() || null,
    embedDescription: form.embedDescription.trim() || null,
    embedColor: hexToInt(form.embedColor),
    embedImageUrl: form.embedImageUrl.trim() || null,
    embedFooter: form.embedFooter.trim() || null,
    ephemeral: !!form.ephemeral,
    allowedRoleIds: form.allowedRoleIds.filter((r) => /^\d{17,20}$/.test(r)).join(","),
  };

  const userId = await getUserId();

  if (originalName && originalName !== name) {
    // Rename: alten Eintrag löschen, neuen anlegen
    await prisma.customCommand.delete({ where: { name: originalName } });
  }

  await prisma.customCommand.upsert({
    where: { name },
    update: data,
    create: { ...data, createdBy: userId },
  });

  const sync = await triggerSync();
  revalidatePath("/dashboard/commands");
  if (!sync.ok) {
    return { ok: false, error: `Gespeichert, aber Discord-Sync fehlgeschlagen: ${sync.error}` };
  }
  return { ok: true };
}

export async function deleteCommand(name: string): Promise<{ ok: boolean; error?: string }> {
  await prisma.customCommand.delete({ where: { name } });
  const sync = await triggerSync();
  revalidatePath("/dashboard/commands");
  if (!sync.ok) {
    return { ok: false, error: `Gelöscht, aber Discord-Sync fehlgeschlagen: ${sync.error}` };
  }
  return { ok: true };
}
