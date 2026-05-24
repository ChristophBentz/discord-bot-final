import type { Client } from "discord.js";
import { prisma } from "@repo/db";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";

export interface NicknameBody {
  nickname?: string | null;
}

export interface DescriptionBody {
  description?: string | null;
}

export async function handleSetNickname(
  client: Client,
  body: NicknameBody,
): Promise<{ ok: true; nickname: string | null } | { ok: false; error: string }> {
  // null/empty → Server-Nickname entfernen (Bot zeigt dann seinen globalen Username)
  const raw = typeof body.nickname === "string" ? body.nickname.trim() : "";
  const nickname = raw === "" ? null : raw;

  if (nickname && nickname.length > 32) {
    return { ok: false, error: "Nickname darf max. 32 Zeichen lang sein." };
  }

  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return { ok: false, error: "Server nicht im Cache." };

  const me = guild.members.me;
  if (!me) return { ok: false, error: "Bot-Member nicht gefunden." };

  try {
    await me.setNickname(nickname, "Dashboard-Update");
    // Direkt in DB syncen damit Dashboard sofort den neuen Namen zeigt
    await prisma.config.update({
      where: { id: 1 },
      data: { botName: nickname ?? client.user?.username ?? "Bot" },
    });
    return { ok: true, nickname };
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    logger.warn(
      `Bot setNickname fehlgeschlagen code=${e?.code} msg=${e?.message}`,
    );
    return {
      ok: false,
      error: `Konnte Nickname nicht setzen: ${e?.message ?? "unbekannter Fehler"}`,
    };
  }
}

export async function handleSetDescription(
  client: Client,
  body: DescriptionBody,
): Promise<{ ok: true; description: string } | { ok: false; error: string }> {
  const raw = typeof body.description === "string" ? body.description.trim() : "";
  if (raw.length > 400) {
    return { ok: false, error: "Beschreibung darf max. 400 Zeichen lang sein." };
  }

  if (!client.application) {
    return { ok: false, error: "Application-Objekt ist nicht geladen." };
  }

  try {
    const updated = await client.application.edit({ description: raw });
    return { ok: true, description: updated.description ?? raw };
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    logger.warn(
      `Bot setDescription fehlgeschlagen code=${e?.code} msg=${e?.message}`,
    );
    return {
      ok: false,
      error: `Konnte Beschreibung nicht setzen: ${e?.message ?? "unbekannter Fehler"}`,
    };
  }
}

export async function handleGetDescription(
  client: Client,
): Promise<{ ok: true; description: string } | { ok: false; error: string }> {
  if (!client.application) {
    return { ok: false, error: "Application-Objekt ist nicht geladen." };
  }
  try {
    const app = await client.application.fetch();
    return { ok: true, description: app.description ?? "" };
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    return {
      ok: false,
      error: `Konnte Beschreibung nicht laden: ${e?.message ?? "unbekannter Fehler"}`,
    };
  }
}
