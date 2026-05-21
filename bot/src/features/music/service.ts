import type { GuildMember } from "discord.js";
import { prisma } from "@repo/db";

let cachedRoles: { ids: Set<string>; loadedAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

async function loadDjRoles(): Promise<Set<string>> {
  if (cachedRoles && Date.now() - cachedRoles.loadedAt < CACHE_TTL_MS) return cachedRoles.ids;
  const rows = await prisma.musicRole.findMany({ select: { roleId: true } });
  cachedRoles = { ids: new Set(rows.map((r) => r.roleId)), loadedAt: Date.now() };
  return cachedRoles.ids;
}

export function invalidateMusicRoleCache(): void {
  cachedRoles = null;
}

// User darf Musik steuern, wenn er mindestens eine DJ-Rolle hat.
export async function memberCanControlMusic(member: GuildMember): Promise<boolean> {
  const allowed = await loadDjRoles();
  if (allowed.size === 0) return false;
  for (const id of member.roles.cache.keys()) {
    if (allowed.has(id)) return true;
  }
  return false;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
