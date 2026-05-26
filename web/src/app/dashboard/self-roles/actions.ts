"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type Result = { ok: true } | { ok: false; error: string };
export type PanelType = "reaction" | "button" | "dropdown";
const VALID_TYPES: PanelType[] = ["reaction", "button", "dropdown"];

async function requireAuth(): Promise<{ ok: false; error: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

interface PanelInput {
  channelId: string;
  type: PanelType;
  title: string;
  description: string | null;
  color: number | null;
  uniqueChoice: boolean;
  useEmbed: boolean;
  enabled: boolean;
}

function parsePanelInput(formData: FormData): { ok: true; data: PanelInput } | { ok: false; error: string } {
  const channelId = String(formData.get("channelId") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const colorHex = String(formData.get("color") ?? "").trim();
  const uniqueChoice = formData.get("uniqueChoice") === "on";
  const useEmbed = formData.get("useEmbed") === "on";
  const enabled = formData.get("enabled") === "on";

  if (!/^\d{17,20}$/.test(channelId)) return { ok: false, error: "Ungültige Channel-ID." };
  if (!VALID_TYPES.includes(type as PanelType)) return { ok: false, error: "Ungültiger Panel-Typ." };
  if (!title) return { ok: false, error: "Titel darf nicht leer sein." };
  if (title.length > 256) return { ok: false, error: "Titel max. 256 Zeichen." };
  if (description && description.length > 2000) return { ok: false, error: "Beschreibung max. 2000 Zeichen." };

  let color: number | null = null;
  if (colorHex) {
    const m = colorHex.match(/^#?([0-9a-fA-F]{6})$/);
    if (!m) return { ok: false, error: "Farbe muss als #RRGGBB sein." };
    color = parseInt(m[1]!, 16);
  }

  return {
    ok: true,
    data: {
      channelId,
      type: type as PanelType,
      title,
      description,
      color,
      uniqueChoice,
      useEmbed,
      enabled,
    },
  };
}

export async function createPanel(formData: FormData): Promise<Result & { id?: number }> {
  const auth = await requireAuth();
  if (auth) return auth;
  const parsed = parsePanelInput(formData);
  if (!parsed.ok) return parsed;

  const panel = await prisma.selfRolePanel.create({ data: parsed.data });
  revalidatePath("/dashboard/self-roles");
  return { ok: true, id: panel.id };
}

export async function updatePanel(id: number, formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const parsed = parsePanelInput(formData);
  if (!parsed.ok) return parsed;

  await prisma.selfRolePanel.update({ where: { id }, data: parsed.data });
  revalidatePath("/dashboard/self-roles");
  return { ok: true };
}

export async function deletePanel(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const panel = await prisma.selfRolePanel.findUnique({ where: { id } });
  if (!panel) return { ok: false, error: "Panel nicht gefunden." };
  // Erst Bot-Message löschen, dann DB-Eintrag
  if (panel.messageId) {
    await callBot<unknown>(`/api/selfroles/panels/${id}/delete-message`, { method: "POST" });
  }
  await prisma.selfRolePanel.delete({ where: { id } });
  revalidatePath("/dashboard/self-roles");
  return { ok: true };
}

export async function syncPanel(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot<unknown>(`/api/selfroles/panels/${id}/sync`, { method: "POST" });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/self-roles");
  return { ok: true };
}

interface OptionInput {
  roleId: string;
  label: string;
  description: string | null;
  emoji: string | null;
  buttonStyle: string | null;
}

function parseOptionInput(formData: FormData): { ok: true; data: OptionInput } | { ok: false; error: string } {
  const roleId = String(formData.get("roleId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const buttonStyle = String(formData.get("buttonStyle") ?? "secondary").trim() || null;

  if (!/^\d{17,20}$/.test(roleId)) return { ok: false, error: "Ungültige Rollen-ID." };
  if (!label) return { ok: false, error: "Label darf nicht leer sein." };
  if (label.length > 80) return { ok: false, error: "Label max. 80 Zeichen." };
  if (description && description.length > 100) return { ok: false, error: "Beschreibung max. 100 Zeichen." };

  return { ok: true, data: { roleId, label, description, emoji, buttonStyle } };
}

export async function addOption(panelId: number, formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  const parsed = parseOptionInput(formData);
  if (!parsed.ok) return parsed;

  const existing = await prisma.selfRoleOption.count({ where: { panelId } });
  if (existing >= 25) {
    return { ok: false, error: "Max. 25 Rollen pro Panel (Discord-Limit)." };
  }

  try {
    await prisma.selfRoleOption.create({
      data: { panelId, ...parsed.data, position: existing },
    });
  } catch {
    return { ok: false, error: "Diese Rolle ist bereits im Panel." };
  }
  await callBot<unknown>(`/api/selfroles/panels/${panelId}/sync`, { method: "POST" });
  revalidatePath("/dashboard/self-roles");
  return { ok: true };
}

export interface UploadedEmoji {
  id: string;
  name: string;
  animated: boolean;
  mention: string;
}

export async function uploadEmoji(
  name: string,
  dataUrl: string,
): Promise<{ ok: true; emoji: UploadedEmoji } | { ok: false; error: string }> {
  const auth = await requireAuth();
  if (auth) return auth;
  if (!dataUrl.startsWith("data:image/")) return { ok: false, error: "Nur Bilder erlaubt." };
  if (dataUrl.length > 400_000) return { ok: false, error: "Bild zu groß (max. 256 KB roh)." };
  const r = await callBot<UploadedEmoji>("/api/bot/emoji", {
    method: "POST",
    body: { name, dataUrl },
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, emoji: r.data };
}

export async function removeOption(panelId: number, optionId: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.selfRoleOption.delete({ where: { id: optionId } }).catch(() => null);
  await callBot<unknown>(`/api/selfroles/panels/${panelId}/sync`, { method: "POST" });
  revalidatePath("/dashboard/self-roles");
  return { ok: true };
}
