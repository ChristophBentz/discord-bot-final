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

export interface AvatarBody {
  dataUrl?: string | null;
}

export interface BannerBody {
  dataUrl?: string | null;
}

export interface EmojiUploadBody {
  name?: string;
  dataUrl?: string;
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

export async function handleSetAvatar(
  client: Client,
  body: AvatarBody,
): Promise<{ ok: true; avatarUrl: string | null } | { ok: false; error: string }> {
  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl.trim() : "";

  // Leerer Wert → Avatar entfernen
  if (!dataUrl) {
    if (!client.user) return { ok: false, error: "Client-User nicht geladen." };
    try {
      const updated = await client.user.setAvatar(null);
      const avatarUrl = updated.displayAvatarURL({ size: 256 });
      await prisma.config.update({
        where: { id: 1 },
        data: { botAvatarUrl: avatarUrl },
      });
      return { ok: true, avatarUrl };
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      return { ok: false, error: `Avatar entfernen fehlgeschlagen: ${e?.message}` };
    }
  }

  // Validation: data:image/...;base64,...
  if (!dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Ungültiges Datei-Format (nur Bilder erlaubt)." };
  }
  // Größen-Check (~8MB roh = ~10MB base64)
  if (dataUrl.length > 11_000_000) {
    return { ok: false, error: "Datei zu groß (max. 8 MB)." };
  }

  if (!client.user) return { ok: false, error: "Client-User nicht geladen." };

  try {
    const updated = await client.user.setAvatar(dataUrl);
    const avatarUrl = updated.displayAvatarURL({ size: 256 });
    await prisma.config.update({
      where: { id: 1 },
      data: { botAvatarUrl: avatarUrl },
    });
    return { ok: true, avatarUrl };
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    logger.warn(`Bot setAvatar fehlgeschlagen code=${e?.code} msg=${e?.message}`);
    const hint =
      e?.code === 50035
        ? "Discord-Rate-Limit (max. 2 Avatar-Änderungen pro Stunde)"
        : (e?.message ?? "unbekannter Fehler");
    return { ok: false, error: `Avatar setzen fehlgeschlagen: ${hint}` };
  }
}

export async function handleSetBanner(
  client: Client,
  body: BannerBody,
): Promise<{ ok: true; bannerUrl: string | null } | { ok: false; error: string }> {
  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl.trim() : "";

  if (!client.user) return { ok: false, error: "Client-User nicht geladen." };

  // Leer → Banner entfernen
  if (!dataUrl) {
    try {
      const updated = await client.user.setBanner(null);
      const bannerUrl = updated.bannerURL({ size: 1024 }) ?? null;
      await prisma.config.update({ where: { id: 1 }, data: { botBannerUrl: bannerUrl } });
      return { ok: true, bannerUrl };
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      return { ok: false, error: `Banner entfernen fehlgeschlagen: ${e?.message}` };
    }
  }

  if (!dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Ungültiges Datei-Format (nur Bilder erlaubt)." };
  }
  // Banner-Limit: Discord erlaubt bis 10 MB
  if (dataUrl.length > 14_000_000) {
    return { ok: false, error: "Datei zu groß (max. 10 MB)." };
  }

  try {
    const updated = await client.user.setBanner(dataUrl);
    const bannerUrl = updated.bannerURL({ size: 1024 }) ?? null;
    await prisma.config.update({ where: { id: 1 }, data: { botBannerUrl: bannerUrl } });
    return { ok: true, bannerUrl };
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    logger.warn(`Bot setBanner fehlgeschlagen code=${e?.code} msg=${e?.message}`);
    return {
      ok: false,
      error: `Banner setzen fehlgeschlagen: ${e?.message ?? "unbekannter Fehler"}`,
    };
  }
}

export interface EmojiListItem {
  id: string;
  name: string;
  animated: boolean;
  mention: string;
}

export async function handleListEmojis(
  client: Client,
): Promise<{ ok: true; emojis: EmojiListItem[] } | { ok: false; error: string }> {
  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return { ok: false, error: "Server nicht im Cache." };

  const list: EmojiListItem[] = [];
  for (const e of guild.emojis.cache.values()) {
    if (!e.id || !e.name) continue;
    list.push({
      id: e.id,
      name: e.name,
      animated: e.animated ?? false,
      mention: e.toString(),
    });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, emojis: list };
}

export async function handleUploadEmoji(
  client: Client,
  body: EmojiUploadBody,
): Promise<
  | { ok: true; id: string; name: string; animated: boolean; mention: string }
  | { ok: false; error: string }
> {
  const name = (body.name ?? "").trim();
  const dataUrl = (body.dataUrl ?? "").trim();

  if (!/^\w{2,32}$/.test(name)) {
    return { ok: false, error: "Name: 2–32 Zeichen, nur Buchstaben/Ziffern/Unterstrich." };
  }
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return { ok: false, error: "Ungültiges Bild (nur PNG/JPG/GIF/WEBP)." };
  }
  const buffer = Buffer.from(match[2]!, "base64");
  if (buffer.length === 0) return { ok: false, error: "Leeres Bild." };
  if (buffer.length > 256 * 1024) {
    return { ok: false, error: "Bild zu groß — Discord-Limit ist 256 KB pro Emoji." };
  }

  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return { ok: false, error: "Server nicht im Cache." };

  try {
    const emoji = await guild.emojis.create({ attachment: buffer, name });
    return {
      ok: true,
      id: emoji.id,
      name: emoji.name ?? name,
      animated: emoji.animated ?? false,
      mention: emoji.toString(),
    };
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    const hint =
      e?.code === 30008
        ? "Emoji-Slots des Servers sind voll. Erst alte Emojis löschen oder Server-Boost erhöhen."
        : e?.code === 50013
          ? "Bot fehlt die 'Emojis verwalten'-Permission auf dem Server."
          : e?.message ?? "unbekannter Fehler";
    return { ok: false, error: `Emoji-Upload fehlgeschlagen: ${hint}` };
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
