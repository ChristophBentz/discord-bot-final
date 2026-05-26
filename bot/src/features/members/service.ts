import type { Client, Guild, GuildMember, Role } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { env } from "../../lib/env.js";

function rolesCsv(member: GuildMember): string {
  return member.roles.cache
    .filter((r) => r.id !== member.guild.id) // @everyone raus
    .map((r) => r.id)
    .join(",");
}

// Server-Owner, Admin oder klassische Mod-Rolle → vor Kick/Ban/Timeout geschützt.
export function isMemberProtected(member: GuildMember): boolean {
  if (member.id === member.guild.ownerId) return true;
  const p = member.permissions;
  return (
    p.has(PermissionFlagsBits.Administrator) ||
    p.has(PermissionFlagsBits.KickMembers) ||
    p.has(PermissionFlagsBits.BanMembers) ||
    p.has(PermissionFlagsBits.ModerateMembers)
  );
}

export async function upsertMember(member: GuildMember): Promise<void> {
  const data = {
    username: member.user.username,
    displayName: member.displayName,
    discriminator: member.user.discriminator === "0" ? null : member.user.discriminator,
    avatarUrl: member.displayAvatarURL({ size: 128 }),
    joinedAt: member.joinedAt,
    roleIds: rolesCsv(member),
    isBot: member.user.bot,
    inServer: true,
    isProtected: isMemberProtected(member),
    lastSyncAt: new Date(),
  };
  await prisma.member.upsert({
    where: { userId: member.id },
    update: data,
    create: { userId: member.id, ...data },
  });
}

export async function markMemberLeft(userId: string): Promise<void> {
  await prisma.member
    .update({ where: { userId }, data: { inServer: false } })
    .catch(() => {
      /* falls Member nicht in DB ist, ignorieren */
    });
}

export async function upsertRole(role: Role): Promise<void> {
  await prisma.guildRole.upsert({
    where: { roleId: role.id },
    update: { name: role.name, color: role.color, position: role.position },
    create: {
      roleId: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
    },
  });
}

export async function deleteRole(roleId: string): Promise<void> {
  await prisma.guildRole.delete({ where: { roleId } }).catch(() => {});
}

// Sync aller Members + Roles beim Start.
export async function bulkSync(client: Client): Promise<void> {
  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) {
    logger.warn("Guild für Bulk-Sync nicht gefunden");
    return;
  }
  await syncGuild(guild);
}

async function syncGuild(guild: Guild): Promise<void> {
  try {
    // Rollen syncen (@everyone-Rolle auslassen)
    const roles = await guild.roles.fetch();
    for (const role of roles.values()) {
      if (role.id === guild.id) continue;
      await upsertRole(role);
    }
    logger.info({ count: roles.size - 1 }, "Roles synchronisiert");

    // Members syncen
    const members = await guild.members.fetch();
    for (const member of members.values()) {
      await upsertMember(member);
    }
    logger.info({ count: members.size }, "Members synchronisiert");
  } catch (err) {
    logger.error({ err }, "Bulk-Sync fehlgeschlagen");
  }
}

// Safety-Net: alle 6h einen Full-Sync fahren, falls der Bot zwischendurch
// offline war und userUpdate/guildMemberUpdate-Events verpasst hat.
// Verhindert dass Avatars/Nicknames veraltet bleiben.
const PERIODIC_SYNC_MS = 6 * 60 * 60 * 1000;
let syncInProgress = false;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

export function startPeriodicMemberSync(client: Client): void {
  if (syncIntervalId) return;
  syncIntervalId = setInterval(async () => {
    if (syncInProgress) return;
    syncInProgress = true;
    try {
      await bulkSync(client);
    } finally {
      syncInProgress = false;
    }
  }, PERIODIC_SYNC_MS);
  logger.info(
    { intervalHours: PERIODIC_SYNC_MS / 3_600_000 },
    "Periodischer Member-Sync gestartet",
  );
}
