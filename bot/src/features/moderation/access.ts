import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";

/**
 * Darf dieser User die Mod-Slash-Commands (/ban, /kick, /timeout, /warn,
 * /unban) nutzen?
 *
 * Discord prüft über setDefaultMemberPermissions bereits die Server-
 * Berechtigung. Zusätzlich kann der Owner verlangen, dass diese Commands NUR
 * von Dashboard-berechtigten Personen genutzt werden dürfen — das greift,
 * wenn sowohl die Allowlist als auch restrictCommandsToAllowlist aktiv sind.
 *
 * Bei DB-Fehler: fail-open (erlauben) — die Discord-Permission-Prüfung bleibt
 * als Schutz bestehen, und ein DB-Ausfall soll Mods nicht komplett lähmen.
 */
export async function canUseModCommands(userId: string): Promise<boolean> {
  try {
    const config = await prisma.config.findUnique({
      where: { id: 1 },
      select: { accessAllowlistEnabled: true, restrictCommandsToAllowlist: true },
    });
    // Kopplung nur aktiv, wenn beide Schalter an sind.
    if (!config?.accessAllowlistEnabled || !config.restrictCommandsToAllowlist) {
      return true;
    }
    // Owner darf immer.
    if (process.env.OWNER_DISCORD_ID && userId === process.env.OWNER_DISCORD_ID) {
      return true;
    }
    const allowed = await prisma.allowlistedUser.findUnique({ where: { userId } });
    return Boolean(allowed);
  } catch (err) {
    logger.warn({ err, userId }, "canUseModCommands: DB-Fehler → fail-open");
    return true;
  }
}

export const NO_COMMAND_ACCESS_MESSAGE =
  "❌ Du bist aktuell nicht für die Bot-Moderation freigegeben (Dashboard-Allowlist). Wende dich an den Server-Owner.";
