"use server";

import { prisma, normalizeSearchText } from "@repo/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface AllowedMember {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export type AccessControlData =
  | {
      ok: true;
      enabled: boolean;
      restrictCommands: boolean;
      allowed: AllowedMember[];
      ownerId: string | null;
    }
  | { ok: false; error: string };

async function requireOwner(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const discordId = (session?.user as { discordId?: string } | undefined)?.discordId;
  const ownerId = process.env.OWNER_DISCORD_ID;
  return Boolean(discordId && ownerId && discordId === ownerId);
}

export async function getAccessControl(): Promise<AccessControlData> {
  if (!(await requireOwner())) return { ok: false, error: "Nur der Owner darf das." };

  const [config, allowed] = await Promise.all([
    prisma.config.findUnique({
      where: { id: 1 },
      select: { accessAllowlistEnabled: true, restrictCommandsToAllowlist: true },
    }),
    prisma.allowlistedUser.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const ids = allowed.map((a) => a.userId);
  const members = ids.length
    ? await prisma.member.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, displayName: true, avatarUrl: true },
      })
    : [];
  const byId = new Map(members.map((m) => [m.userId, m]));

  return {
    ok: true,
    enabled: config?.accessAllowlistEnabled ?? false,
    restrictCommands: config?.restrictCommandsToAllowlist ?? false,
    allowed: ids.map((userId) => ({
      userId,
      displayName: byId.get(userId)?.displayName ?? null,
      avatarUrl: byId.get(userId)?.avatarUrl ?? null,
    })),
    ownerId: process.env.OWNER_DISCORD_ID ?? null,
  };
}

export async function setAllowlistEnabled(
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await requireOwner())) return { ok: false, error: "Nur der Owner darf das." };
  await prisma.config.upsert({
    where: { id: 1 },
    update: { accessAllowlistEnabled: enabled },
    create: { id: 1, accessAllowlistEnabled: enabled },
  });
  return { ok: true };
}

export async function setRestrictCommands(
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await requireOwner())) return { ok: false, error: "Nur der Owner darf das." };
  await prisma.config.upsert({
    where: { id: 1 },
    update: { restrictCommandsToAllowlist: enabled },
    create: { id: 1, restrictCommandsToAllowlist: enabled },
  });
  return { ok: true };
}

export async function setMemberAllowed(
  userId: string,
  allowed: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await requireOwner())) return { ok: false, error: "Nur der Owner darf das." };
  if (!/^\d{17,20}$/.test(userId)) return { ok: false, error: "Ungültige User-ID." };
  if (allowed) {
    await prisma.allowlistedUser.upsert({ where: { userId }, update: {}, create: { userId } });
  } else {
    await prisma.allowlistedUser.deleteMany({ where: { userId } });
  }
  return { ok: true };
}

/** Mitglieder für die Allowlist suchen (max. 8), bereits freigegebene ausgenommen. */
export async function searchAllowlistCandidates(
  query: string,
): Promise<AllowedMember[]> {
  if (!(await requireOwner())) return [];
  const q = query.trim();
  if (!q) return [];
  const members = await prisma.member.findMany({
    where: {
      inServer: true,
      OR: [
        { displayName: { contains: q } },
        { username: { contains: q } },
        { searchName: { contains: normalizeSearchText(q) } },
        { userId: q },
      ],
    },
    select: { userId: true, displayName: true, avatarUrl: true },
    take: 8,
  });
  return members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    avatarUrl: m.avatarUrl,
  }));
}
