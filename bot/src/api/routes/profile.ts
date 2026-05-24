import type { Client } from "discord.js";
import { prisma } from "@repo/db";
import { env } from "../../lib/env.js";

export type PresenceStatus = "online" | "idle" | "dnd" | "offline";

export function getMemberPresence(
  client: Client,
  userId: string,
): { ok: true; status: PresenceStatus } | { ok: false; error: string } {
  if (!/^\d{17,20}$/.test(userId)) {
    return { ok: false, error: "Ungültige User-ID." };
  }
  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return { ok: false, error: "Guild nicht im Cache." };
  const presence = guild.presences.cache.get(userId);
  const status = (presence?.status ?? "offline") as PresenceStatus;
  return { ok: true, status };
}

export async function handleRefreshProfile(
  client: Client,
  userId: string,
): Promise<{ ok: true; bannerUrl: string | null } | { ok: false; error: string }> {
  if (!/^\d{17,20}$/.test(userId)) {
    return { ok: false, error: "Ungültige User-ID." };
  }
  try {
    // force=true → zwingt Discord, das volle User-Objekt zu laden (mit banner/accent)
    const user = await client.users.fetch(userId, { force: true });
    const bannerUrl = user.bannerURL({ size: 1024 }) ?? null;
    const accentColor = user.accentColor ?? null;
    const avatarUrl = user.displayAvatarURL({ size: 128 });

    await prisma.member.upsert({
      where: { userId },
      update: {
        bannerUrl,
        accentColor,
        avatarUrl,
        bannerRefreshedAt: new Date(),
      },
      create: {
        userId,
        username: user.username,
        displayName: user.displayName ?? user.username,
        avatarUrl,
        bannerUrl,
        accentColor,
        bannerRefreshedAt: new Date(),
      },
    });

    return { ok: true, bannerUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Discord-API-Fehler.",
    };
  }
}
