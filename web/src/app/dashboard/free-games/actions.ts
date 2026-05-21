"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type Result = { ok: true } | { ok: false; error: string };

async function requireAuth(): Promise<Result | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

export async function saveFreeGamesSettings(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const enabled = formData.get("freeGamesEnabled") === "on";
  const channelId = String(formData.get("freeGamesChannelId") ?? "").trim() || null;
  const epic = formData.get("freeGamesEpic") === "on";
  const steam = formData.get("freeGamesSteam") === "on";
  const gog = formData.get("freeGamesGog") === "on";
  const console_ = formData.get("freeGamesConsole") === "on";
  const games = formData.get("freeGamesIncludeGames") === "on";
  const dlc = formData.get("freeGamesIncludeDlc") === "on";
  const loot = formData.get("freeGamesIncludeLoot") === "on";
  const message = String(formData.get("freeGamesMessage") ?? "").trim() || null;
  const pingRoleId = String(formData.get("freeGamesPingRoleId") ?? "").trim() || null;
  const footerText = String(formData.get("freeGamesFooterText") ?? "").trim() || null;

  if (enabled && !channelId) {
    return { ok: false, error: "Bitte einen Channel auswählen, wenn das Feature aktiv ist." };
  }
  if (channelId && !/^\d{17,20}$/.test(channelId)) {
    return { ok: false, error: "Ungültige Channel-ID." };
  }
  if (pingRoleId && !/^\d{17,20}$/.test(pingRoleId)) {
    return { ok: false, error: "Ungültige Rollen-ID." };
  }
  if (message && message.length > 500) {
    return { ok: false, error: "Nachricht max. 500 Zeichen." };
  }
  if (footerText && footerText.length > 200) {
    return { ok: false, error: "Footer max. 200 Zeichen." };
  }

  await prisma.config.upsert({
    where: { id: 1 },
    update: {
      freeGamesEnabled: enabled,
      freeGamesChannelId: channelId,
      freeGamesEpic: epic,
      freeGamesSteam: steam,
      freeGamesGog: gog,
      freeGamesConsole: console_,
      freeGamesIncludeGames: games,
      freeGamesIncludeDlc: dlc,
      freeGamesIncludeLoot: loot,
      freeGamesMessage: message,
      freeGamesPingRoleId: pingRoleId,
      freeGamesFooterText: footerText,
    },
    create: {
      id: 1,
      freeGamesEnabled: enabled,
      freeGamesChannelId: channelId,
      freeGamesEpic: epic,
      freeGamesSteam: steam,
      freeGamesGog: gog,
      freeGamesConsole: console_,
      freeGamesIncludeGames: games,
      freeGamesIncludeDlc: dlc,
      freeGamesIncludeLoot: loot,
      freeGamesMessage: message,
      freeGamesPingRoleId: pingRoleId,
      freeGamesFooterText: footerText,
    },
  });

  revalidatePath("/dashboard/free-games");
  return { ok: true };
}

export async function deletePostHistory(giveawayId: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.freeGamePost.delete({ where: { giveawayId } }).catch(() => null);
  revalidatePath("/dashboard/free-games");
  return { ok: true };
}

export async function clearPostHistory(): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.freeGamePost.deleteMany();
  revalidatePath("/dashboard/free-games");
  return { ok: true };
}

export async function checkNow(): Promise<
  | { ok: true; posted: number; skipped: number; fetched: number }
  | { ok: false; error: string }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  const r = await callBot<{ ok: true; posted: number; skipped: number; fetched: number }>(
    "/api/freegames/check",
    { method: "POST" },
  );
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/free-games");
  return { ok: true, posted: r.data.posted, skipped: r.data.skipped, fetched: r.data.fetched };
}
