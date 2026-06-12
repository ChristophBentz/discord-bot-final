import type { Client, Guild, GuildMember, Role } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { prisma, normalizeSearchText } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { registerScheduler, recordSchedulerRun } from "../../lib/healthBuffer.js";
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
    // Normalisiert (𝑺𝒏𝒐𝒐𝒌𝒚 → snooky), damit die Dashboard-Suche
    // Unicode-Schriftarten findet.
    searchName: normalizeSearchText(`${member.displayName} ${member.user.username}`),
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

// Permissions, die eine Rolle „gefährlich" machen — eine solche Rolle wird
// nie über das Dashboard vergeben (verhindert Admin-Eskalation durch Mods).
const PRIVILEGED_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ManageGuildExpressions,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.MentionEveryone,
];

export function roleIsPrivileged(role: Role): boolean {
  return PRIVILEGED_PERMISSIONS.some((perm) => role.permissions.has(perm));
}

// Permissions, die Dashboard-Zugang gewähren — identisch mit isMemberProtected.
const ACCESS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
];

export function roleGrantsAccess(role: Role): boolean {
  return ACCESS_PERMISSIONS.some((perm) => role.permissions.has(perm));
}

export async function upsertRole(role: Role): Promise<void> {
  const data = {
    name: role.name,
    color: role.color,
    position: role.position,
    privileged: roleIsPrivileged(role),
    managed: role.managed,
    grantsAccess: roleGrantsAccess(role),
  };
  await prisma.guildRole.upsert({
    where: { roleId: role.id },
    update: data,
    create: { roleId: role.id, ...data },
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
  registerScheduler("Member-Sync", PERIODIC_SYNC_MS);
  syncIntervalId = setInterval(async () => {
    if (syncInProgress) return;
    syncInProgress = true;
    try {
      await bulkSync(client);
      const count = client.guilds.cache.get(env.DISCORD_GUILD_ID)?.memberCount ?? 0;
      recordSchedulerRun("Member-Sync", { ok: true, details: `${count} Members synchronisiert` });
    } catch (err) {
      recordSchedulerRun("Member-Sync", { ok: false, details: String(err) });
    } finally {
      syncInProgress = false;
    }
  }, PERIODIC_SYNC_MS);
  logger.info(
    { intervalHours: PERIODIC_SYNC_MS / 3_600_000 },
    "Periodischer Member-Sync gestartet",
  );
}
