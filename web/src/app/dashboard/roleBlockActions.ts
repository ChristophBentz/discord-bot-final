"use server";

import { prisma } from "@repo/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface RoleBlockRow {
  roleId: string;
  name: string;
  color: number;
  privileged: boolean;
  managed: boolean;
  blocked: boolean;
  grantsAccess: boolean;
}

export interface AccessRoleRow {
  roleId: string;
  name: string;
  color: number;
}

export interface OwnerInfo {
  id: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export type RoleBlockData =
  | { ok: true; roles: RoleBlockRow[]; accessRoles: AccessRoleRow[]; owner: OwnerInfo }
  | { ok: false; error: string };

async function requireOwner(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const discordId = (session?.user as { discordId?: string } | undefined)?.discordId;
  const ownerId = process.env.OWNER_DISCORD_ID;
  return Boolean(discordId && ownerId && discordId === ownerId);
}

export async function getRoleBlockData(): Promise<RoleBlockData> {
  if (!(await requireOwner())) return { ok: false, error: "Nur der Owner darf das." };

  const ownerId = process.env.OWNER_DISCORD_ID ?? null;
  const [roles, blocked, ownerMember] = await Promise.all([
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
    prisma.blockedRole.findMany({ select: { roleId: true } }),
    ownerId
      ? prisma.member.findUnique({
          where: { userId: ownerId },
          select: { displayName: true, avatarUrl: true },
        })
      : Promise.resolve(null),
  ]);
  const blockedSet = new Set(blocked.map((b) => b.roleId));

  return {
    ok: true,
    roles: roles.map((r) => ({
      roleId: r.roleId,
      name: r.name,
      color: r.color,
      privileged: r.privileged,
      managed: r.managed,
      blocked: blockedSet.has(r.roleId),
      grantsAccess: r.grantsAccess,
    })),
    // Rollen, die Dashboard-Zugang gewähren (Admin/Kick/Ban/Timeout).
    accessRoles: roles
      .filter((r) => r.grantsAccess)
      .map((r) => ({ roleId: r.roleId, name: r.name, color: r.color })),
    owner: {
      id: ownerId,
      displayName: ownerMember?.displayName ?? null,
      avatarUrl: ownerMember?.avatarUrl ?? null,
    },
  };
}

export async function setRoleBlocked(
  roleId: string,
  blocked: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await requireOwner())) return { ok: false, error: "Nur der Owner darf das." };
  if (!/^\d{17,20}$/.test(roleId)) return { ok: false, error: "Ungültige Rollen-ID." };

  if (blocked) {
    await prisma.blockedRole.upsert({
      where: { roleId },
      update: {},
      create: { roleId },
    });
  } else {
    await prisma.blockedRole.deleteMany({ where: { roleId } });
  }
  return { ok: true };
}
