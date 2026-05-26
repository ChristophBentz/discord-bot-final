"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export interface EmojiItem {
  id: string;
  name: string;
  animated: boolean;
  mention: string;
}

async function requireAuth(): Promise<{ ok: false; error: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

export async function listEmojis(): Promise<EmojiItem[]> {
  const r = await callBot<{ emojis: EmojiItem[] }>("/api/bot/emojis", { method: "GET" });
  return r.ok ? r.data.emojis : [];
}

export async function uploadEmoji(
  name: string,
  dataUrl: string,
): Promise<{ ok: true; emoji: EmojiItem } | { ok: false; error: string }> {
  const auth = await requireAuth();
  if (auth) return auth;
  if (!dataUrl.startsWith("data:image/")) return { ok: false, error: "Nur Bilder erlaubt." };
  if (dataUrl.length > 400_000) return { ok: false, error: "Bild zu groß (max. 256 KB roh)." };
  const r = await callBot<EmojiItem>("/api/bot/emoji", {
    method: "POST",
    body: { name, dataUrl },
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/emojis");
  return { ok: true, emoji: r.data };
}

export async function deleteEmoji(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot<unknown>(`/api/bot/emojis/${id}`, { method: "DELETE" });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/emojis");
  return { ok: true };
}

export async function renameEmoji(
  id: string,
  name: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const auth = await requireAuth();
  if (auth) return auth;
  const r = await callBot<{ name: string }>(`/api/bot/emojis/${id}`, {
    method: "PATCH",
    body: { name },
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/emojis");
  return { ok: true, name: r.data.name };
}
