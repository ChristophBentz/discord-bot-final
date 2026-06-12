import type { Client } from "discord.js";
import { prisma } from "@repo/db";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";
import { roleIsPrivileged } from "../../features/members/service.js";

export interface RoleChangeBody {
  add?: string[];
  remove?: string[];
  /** Discord-ID des Mods, der die Änderung im Dashboard auslöst (für Hierarchie-Check) */
  actorId?: string;
}

export type RoleChangeResult =
  | { ok: true; addedCount: number; removedCount: number }
  | { ok: false; error: string };

function isValidRoleId(id: unknown): id is string {
  return typeof id === "string" && /^\d{17,20}$/.test(id);
}

export async function handleRoleChange(
  client: Client,
  userId: string,
  body: RoleChangeBody,
): Promise<RoleChangeResult> {
  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return { ok: false, error: "Guild nicht im Cache" };

  const add = (body.add ?? []).filter(isValidRoleId);
  const remove = (body.remove ?? []).filter(isValidRoleId);
  if (add.length === 0 && remove.length === 0) {
    return { ok: false, error: "Keine Rollen zum Ändern" };
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return { ok: false, error: "Member nicht gefunden" };

  const ownerId = process.env.OWNER_DISCORD_ID;
  const actorIsOwner = Boolean(body.actorId && ownerId && body.actorId === ownerId);

  // ─── Schutz-Checks beim HINZUFÜGEN (Entfernen ist unkritisch) ───────────────
  // Der Owner darf alles (kann es eh direkt in Discord). Für alle anderen:
  // keine privilegierten/managed/gesperrten Rollen und nichts über der eigenen
  // höchsten Rolle — verhindert Rechteausweitung zum Admin.
  if (add.length > 0 && !actorIsOwner) {
    const [dbRoles, blocked] = await Promise.all([
      prisma.guildRole.findMany({
        where: { roleId: { in: add } },
        select: { roleId: true, name: true, privileged: true, managed: true },
      }),
      prisma.blockedRole.findMany({ select: { roleId: true } }),
    ]);
    const dbById = new Map(dbRoles.map((r) => [r.roleId, r]));
    const blockedSet = new Set(blocked.map((b) => b.roleId));

    // Höchste Rollen-Position des handelnden Mods.
    let actorTopPosition = 0;
    if (body.actorId) {
      const actor = await guild.members.fetch(body.actorId).catch(() => null);
      actorTopPosition = actor?.roles.highest.position ?? 0;
    }

    for (const roleId of add) {
      const info = dbById.get(roleId);
      const live = guild.roles.cache.get(roleId);
      const name = info?.name ?? live?.name ?? roleId;

      if (blockedSet.has(roleId)) {
        return { ok: false, error: `Rolle „${name}" ist vom Owner gesperrt.` };
      }
      // privileged: DB-Flag ODER Live-Check (falls Sync noch nicht durch ist).
      if (info?.privileged || (live && roleIsPrivileged(live))) {
        return {
          ok: false,
          error: `Rolle „${name}" trägt Admin-/Verwaltungsrechte und kann nicht über das Dashboard vergeben werden.`,
        };
      }
      if (info?.managed || live?.managed) {
        return { ok: false, error: `Rolle „${name}" wird von Discord verwaltet und ist nicht manuell vergebbar.` };
      }
      // Hierarchie: nichts über der eigenen höchsten Rolle.
      if (body.actorId && live && live.position >= actorTopPosition) {
        return {
          ok: false,
          error: `Rolle „${name}" liegt über deiner höchsten Rolle — Vergabe nicht erlaubt.`,
        };
      }
    }
  }

  // Bot-Rolle und @everyone nie ändern.
  const safe = (id: string) => id !== guild.id;

  try {
    if (add.length > 0) {
      await member.roles.add(add.filter(safe), "Dashboard-Änderung");
    }
    if (remove.length > 0) {
      await member.roles.remove(remove.filter(safe), "Dashboard-Änderung");
    }
    logger.info(
      { userId, actorId: body.actorId, add: add.length, remove: remove.length },
      "Rollen via API geändert",
    );
    return { ok: true, addedCount: add.length, removedCount: remove.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ userId, err: msg }, "Rollen-Änderung fehlgeschlagen");
    // Discord-Fehler 50013 = Missing Permissions (Bot-Rolle zu niedrig).
    if (msg.includes("50013") || msg.toLowerCase().includes("missing permissions")) {
      return {
        ok: false,
        error:
          "Discord lehnt die Änderung ab — die Bot-Rolle muss höher sein als die zu vergebende Rolle.",
      };
    }
    return { ok: false, error: msg };
  }
}
