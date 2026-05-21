import type { Client } from "discord.js";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";

export interface RoleChangeBody {
  add?: string[];
  remove?: string[];
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

  // Schutz: Bot-Rolle und @everyone nie ändern.
  const safe = (id: string) => id !== guild.id;

  try {
    if (add.length > 0) {
      await member.roles.add(add.filter(safe), "Dashboard-Änderung");
    }
    if (remove.length > 0) {
      await member.roles.remove(remove.filter(safe), "Dashboard-Änderung");
    }
    logger.info(
      { userId, add: add.length, remove: remove.length },
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
