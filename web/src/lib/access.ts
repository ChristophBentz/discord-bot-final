import { prisma } from "@repo/db";

/**
 * Zentrale Entscheidung, ob eine Discord-ID ins Dashboard darf.
 * Wird vom Login-Gate (auth.ts) UND vom Per-Request-Re-Check (dashboard/layout)
 * genutzt, damit beide nie auseinanderlaufen.
 *
 * Regeln:
 *  - Owner (OWNER_DISCORD_ID) kommt IMMER rein — kann sich nie aussperren.
 *  - Allowlist AUS: jedes aktive Mitglied mit Mod-Permission (isProtected).
 *  - Allowlist AN: nur explizit freigegebene Mitglieder (AllowlistedUser),
 *    die noch im Server sind.
 */
export async function canAccessDashboard(discordId: string | null | undefined): Promise<boolean> {
  if (!discordId) return false;

  const ownerId = process.env.OWNER_DISCORD_ID;
  if (ownerId && discordId === ownerId) return true;

  const config = await prisma.config
    .findUnique({ where: { id: 1 }, select: { accessAllowlistEnabled: true } })
    .catch(() => null);

  const member = await prisma.member.findUnique({
    where: { userId: discordId },
    select: { isProtected: true, inServer: true },
  });
  if (!member?.inServer) return false;

  if (config?.accessAllowlistEnabled) {
    const allowed = await prisma.allowlistedUser.findUnique({ where: { userId: discordId } });
    return Boolean(allowed);
  }

  return Boolean(member.isProtected);
}
