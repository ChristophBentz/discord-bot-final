import type { Client, TextChannel } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { prisma } from "@repo/db";
import { buildGiveawayMessage, drawWinners, refreshGiveawayMessage, rerollSingleWinner, type BonusRole } from "../../features/giveaway/service.js";

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const SNOWFLAKE = /^\d{17,20}$/;

export interface CreateGiveawayBody {
  channelId?: string;
  prize?: string;
  description?: string;
  rewardCode?: string;
  winnerCount?: number;
  durationSeconds?: number;
  minLevel?: number | null;
  requiredRoleId?: string | null;
  minMemberDays?: number | null;
  bonusRoles?: BonusRole[];
  hostId?: string;
}

async function postableChannel(
  client: Client,
  channelId: string,
): Promise<{ ok: true; channel: TextChannel } | { ok: false; error: string }> {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) {
    return { ok: false, error: "Channel nicht gefunden oder nicht beschreibbar." };
  }
  const me = "guild" in channel ? channel.guild?.members.me : null;
  if (me && "permissionsFor" in channel) {
    const perms = (channel as TextChannel).permissionsFor(me);
    if (!perms?.has(PermissionFlagsBits.SendMessages)) {
      return { ok: false, error: "Bot hat keine Send-Permission in diesem Channel." };
    }
  }
  return { ok: true, channel: channel as TextChannel };
}

export async function handleCreateGiveaway(
  client: Client,
  body: CreateGiveawayBody,
): Promise<Result<{ id: number }>> {
  const channelId = body.channelId ?? "";
  if (!SNOWFLAKE.test(channelId)) return { ok: false, error: "Ungültige Channel-ID." };
  const prize = (body.prize ?? "").trim();
  if (!prize) return { ok: false, error: "Preis darf nicht leer sein." };
  if (prize.length > 200) return { ok: false, error: "Preis max. 200 Zeichen." };
  const winnerCount = Math.max(1, Math.min(50, Math.floor(body.winnerCount ?? 1)));
  const durationSec = Math.max(10, Math.floor(body.durationSeconds ?? 0));
  if (!durationSec) return { ok: false, error: "Dauer fehlt." };
  if (body.requiredRoleId && !SNOWFLAKE.test(body.requiredRoleId)) {
    return { ok: false, error: "Ungültige Rollen-ID." };
  }

  const c = await postableChannel(client, channelId);
  if (!c.ok) return c;

  // Bonus-Rollen säubern (gültige Snowflake + positive Extra-Lose).
  const bonusRoles = (body.bonusRoles ?? [])
    .filter((b) => b && SNOWFLAKE.test(b.roleId) && Number.isFinite(b.extra) && b.extra > 0)
    .map((b) => ({ roleId: b.roleId, extra: Math.min(100, Math.floor(b.extra)) }));

  const endsAt = new Date(Date.now() + durationSec * 1000);
  const giveaway = await prisma.giveaway.create({
    data: {
      channelId,
      prize,
      description: (body.description ?? "").trim().slice(0, 1000) || null,
      rewardCode: (body.rewardCode ?? "").trim().slice(0, 2000) || null,
      bonusRolesJson: bonusRoles.length ? JSON.stringify(bonusRoles) : null,
      winnerCount,
      hostId: body.hostId ?? "dashboard",
      minLevel: body.minLevel ?? null,
      requiredRoleId: body.requiredRoleId ?? null,
      minMemberDays: body.minMemberDays ?? null,
      endsAt,
    },
    include: { entries: { select: { userId: true, isWinner: true, tickets: true } } },
  });

  const msg = await c.channel.send(buildGiveawayMessage(giveaway));
  await prisma.giveaway.update({ where: { id: giveaway.id }, data: { messageId: msg.id } });
  return { ok: true, id: giveaway.id };
}

export async function handleEndGiveaway(
  client: Client,
  id: number,
): Promise<Result<{ winners: string[] }>> {
  const g = await prisma.giveaway.findUnique({ where: { id } });
  if (!g) return { ok: false, error: "Giveaway nicht gefunden." };
  if (g.ended) return { ok: false, error: "Giveaway ist bereits beendet." };
  const { winners } = await drawWinners(client, id);
  return { ok: true, winners };
}

export async function handleRerollGiveaway(
  client: Client,
  id: number,
): Promise<Result<{ winners: string[] }>> {
  const g = await prisma.giveaway.findUnique({ where: { id } });
  if (!g) return { ok: false, error: "Giveaway nicht gefunden." };
  if (!g.ended) return { ok: false, error: "Giveaway läuft noch — erst beenden." };
  const { winners } = await drawWinners(client, id);
  return { ok: true, winners };
}

export async function handleRerollWinner(
  client: Client,
  id: number,
  userId: string,
): Promise<Result<{ newWinner: string | null }>> {
  if (!SNOWFLAKE.test(userId)) return { ok: false, error: "Ungültige User-ID." };
  const res = await rerollSingleWinner(client, id, userId);
  if (!res.ok) return res;
  return { ok: true, newWinner: res.newWinner };
}

export async function handleDeleteGiveaway(
  client: Client,
  id: number,
): Promise<Result> {
  const g = await prisma.giveaway.findUnique({ where: { id } });
  if (!g) return { ok: false, error: "Giveaway nicht gefunden." };
  if (g.messageId) {
    const channel = await client.channels.fetch(g.channelId).catch(() => null);
    if (channel?.isTextBased() && "messages" in channel) {
      const msg = await (channel as TextChannel).messages.fetch(g.messageId).catch(() => null);
      await msg?.delete().catch(() => null);
    }
  }
  await prisma.giveaway.delete({ where: { id } });
  return { ok: true };
}

// Re-Export für den Server-Import.
export { refreshGiveawayMessage };
