import type { Client, GuildMember, Invite } from "discord.js";
import { prisma } from "@repo/db";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";

// Invite-Tracking: Wir merken uns den Uses-Stand aller Invites. Joint jemand,
// verrät der Invite mit gestiegenem Uses-Zähler, wer eingeladen hat.
const inviteCache = new Map<string, { uses: number; inviterId: string | null }>();

export async function syncInviteCache(client: Client): Promise<void> {
  const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);
  if (!guild) return;
  try {
    const invites = await guild.invites.fetch();
    inviteCache.clear();
    for (const invite of invites.values()) {
      inviteCache.set(invite.code, {
        uses: invite.uses ?? 0,
        inviterId: invite.inviter?.id ?? null,
      });
    }
    logger.info({ count: inviteCache.size }, "Invite-Cache synchronisiert");
  } catch (err) {
    logger.warn(
      { err },
      "Invites konnten nicht geladen werden — fehlt dem Bot die 'Server verwalten'-Berechtigung?",
    );
  }
}

export function trackInviteCreate(invite: Invite): void {
  inviteCache.set(invite.code, {
    uses: invite.uses ?? 0,
    inviterId: invite.inviter?.id ?? null,
  });
}

export function trackInviteDelete(invite: Invite): void {
  inviteCache.delete(invite.code);
}

export async function recordJoin(member: GuildMember): Promise<void> {
  if (member.user.bot) return; // Bots joinen via OAuth, nicht über Invites

  let used: { code: string; inviterId: string | null } | null = null;
  try {
    const invites = await member.guild.invites.fetch();
    for (const invite of invites.values()) {
      const cached = inviteCache.get(invite.code);
      const uses = invite.uses ?? 0;
      if (cached ? uses > cached.uses : uses > 0) {
        used = { code: invite.code, inviterId: invite.inviter?.id ?? null };
      }
      inviteCache.set(invite.code, { uses, inviterId: invite.inviter?.id ?? null });
    }
    // One-Time-Invites (max uses erreicht) verschwinden mit dem Join: war ein Code
    // im Cache, der jetzt fehlt, war er es.
    if (!used) {
      for (const [code, cached] of inviteCache) {
        if (!invites.has(code)) {
          used = { code, inviterId: cached.inviterId };
          inviteCache.delete(code);
          break;
        }
      }
    }
  } catch (err) {
    logger.warn({ err, userId: member.id }, "Invite-Zuordnung beim Join fehlgeschlagen");
  }

  // Auch ohne Zuordnung speichern — der Join selbst ist die Information.
  await prisma.inviteUse.create({
    data: {
      userId: member.id,
      inviterId: used?.inviterId ?? null,
      inviteCode: used?.code ?? null,
    },
  });
  logger.debug({ userId: member.id, via: used?.code ?? "unbekannt" }, "Join erfasst");
}
