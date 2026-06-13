import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Client,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { prisma, type Giveaway } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { registerScheduler, recordSchedulerRun } from "../../lib/healthBuffer.js";
import { env } from "../../lib/env.js";

const BRAND_COLOR = 0xa855f7;
const ENDED_COLOR = 0x4b5563;
// Häufig prüfen, damit auch kurze Test-Giveaways (z.B. 30s) zeitnah enden.
const CHECK_INTERVAL_MS = 10 * 1000;

interface GiveawayWithEntries extends Giveaway {
  entries: { userId: string; isWinner: boolean; tickets: number }[];
}

export interface BonusRole {
  roleId: string;
  extra: number;
}

export function parseBonusRoles(json: string | null): BonusRole[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as BonusRole[];
    return Array.isArray(arr)
      ? arr.filter((b) => b && typeof b.roleId === "string" && Number.isFinite(b.extra))
      : [];
  } catch {
    return [];
  }
}

/** Wie viele Lose hat dieser Member? Basis 1 + Bonus aller passenden Rollen. */
export function computeTickets(member: GuildMember, bonusRoles: BonusRole[]): number {
  let tickets = 1;
  for (const b of bonusRoles) {
    if (member.roles.cache.has(b.roleId)) tickets += Math.max(0, Math.floor(b.extra));
  }
  return Math.max(1, tickets);
}

/** Baut Embed + Teilnahme-Button für eine Giveaway-Nachricht. */
export function buildGiveawayMessage(g: GiveawayWithEntries): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const entryCount = g.entries.length;
  const winners = g.entries.filter((e) => e.isWinner).map((e) => e.userId);
  const totalTickets = g.entries.reduce((s, e) => s + (e.tickets ?? 1), 0);
  const bonusRoles = parseBonusRoles(g.bonusRolesJson);

  const endTs = Math.floor(g.endsAt.getTime() / 1000);
  const criteria: string[] = [];
  if (g.minLevel) criteria.push(`🔹 Mindestens **Level ${g.minLevel}**`);
  if (g.requiredRoleId) criteria.push(`🔹 Rolle <@&${g.requiredRoleId}> erforderlich`);
  if (g.minMemberDays) criteria.push(`🔹 Seit mind. **${g.minMemberDays} Tagen** dabei`);

  const embed = new EmbedBuilder()
    .setColor(g.ended ? ENDED_COLOR : BRAND_COLOR)
    .setAuthor({ name: g.ended ? "Giveaway · beendet" : "🎉 GIVEAWAY" })
    .setTitle(g.prize)
    .setFooter({ text: `Giveaway #${g.id} · Hosted by Team` });

  if (g.imageUrl) embed.setImage(g.imageUrl);

  // Transparenz: erklären, wie ausgelost wird.
  const drawLines: string[] = [];
  if (bonusRoles.length > 0) {
    drawLines.push(
      "Gewichtete Verlosung — jeder hat **1 Los**, bestimmte Rollen bekommen Bonus-Lose:",
    );
    for (const b of bonusRoles) drawLines.push(`🎟️ <@&${b.roleId}> · **+${b.extra}**`);
    drawLines.push("Mehr Lose = höhere Gewinnchance. Pro Teilnehmer wird aber nur einmal gewonnen.");
  } else {
    drawLines.push("Faire Zufallsziehung — jeder Teilnehmer hat **genau 1 Los**, gleiche Chance für alle.");
  }

  if (!g.ended) {
    const lines = [
      g.description ? `${g.description}\n` : "",
      `Klick auf **🎉 Teilnehmen**, um mitzumachen!`,
      "",
      `**Endet:** <t:${endTs}:R> · <t:${endTs}:f>`,
      `**Gewinner:** ${g.winnerCount}  •  **Teilnehmer:** ${entryCount}`,
      criteria.length ? `\n**Bedingungen**\n${criteria.join("\n")}` : "",
    ];
    embed.setDescription(lines.filter((l) => l !== "").join("\n")).setTimestamp(g.endsAt);
    embed.addFields({
      name: "🎲 So wird ausgelost",
      value: drawLines.join("\n") + (totalTickets > 0 ? `\n\n_Aktuell ${totalTickets} Lose im Topf._` : ""),
    });
  } else {
    const winnerLine =
      winners.length > 0
        ? `🏆 **${winners.length === 1 ? "Gewinner" : "Gewinner"}:** ${winners.map((id) => `<@${id}>`).join(", ")}`
        : "Leider gab es keine gültigen Teilnehmer.";
    embed.setDescription(
      [
        g.description ? `${g.description}\n` : "",
        winnerLine,
        "",
        `Beendet <t:${endTs}:R> · ${entryCount} Teilnehmer`,
      ]
        .filter((l) => l !== "")
        .join("\n"),
    );
  }

  const button = new ButtonBuilder()
    .setCustomId(`giveaway:enter:${g.id}`)
    .setStyle(g.ended ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setEmoji("🎉")
    .setLabel(g.ended ? "Beendet" : "Teilnehmen")
    .setDisabled(g.ended);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
  };
}

/** Prüft, ob ein Member die Teilnahme-Kriterien erfüllt. Gibt Fehlertext oder null. */
export async function checkEligibility(
  member: GuildMember,
  g: Giveaway,
): Promise<string | null> {
  if (g.requiredRoleId && !member.roles.cache.has(g.requiredRoleId)) {
    return `Dir fehlt die nötige Rolle <@&${g.requiredRoleId}>.`;
  }
  if (g.minMemberDays && member.joinedTimestamp) {
    const days = (Date.now() - member.joinedTimestamp) / 86_400_000;
    if (days < g.minMemberDays) {
      return `Du musst seit mindestens ${g.minMemberDays} Tagen auf dem Server sein.`;
    }
  }
  if (g.minLevel) {
    const lvl = await prisma.levelUser.findUnique({
      where: { userId: member.id },
      select: { level: true },
    });
    if ((lvl?.level ?? 0) < g.minLevel) {
      return `Du brauchst mindestens Level ${g.minLevel} (du hast Level ${lvl?.level ?? 0}).`;
    }
  }
  return null;
}

async function fetchGiveaway(id: number): Promise<GiveawayWithEntries | null> {
  return prisma.giveaway.findUnique({
    where: { id },
    include: { entries: { select: { userId: true, isWinner: true, tickets: true } } },
  });
}

/** Aktualisiert die Discord-Nachricht eines Giveaways. */
export async function refreshGiveawayMessage(client: Client, id: number): Promise<void> {
  const g = await fetchGiveaway(id);
  if (!g?.messageId) return;
  const channel = await client.channels.fetch(g.channelId).catch(() => null);
  if (!channel?.isTextBased() || !("messages" in channel)) return;
  const msg = await (channel as TextChannel).messages.fetch(g.messageId).catch(() => null);
  if (!msg) return;
  await msg.edit(buildGiveawayMessage(g)).catch((err) => logger.warn({ err, id }, "Giveaway-Edit fehlgeschlagen"));
}

/**
 * Gewichtete Ziehung OHNE Zurücklegen: jeder Teilnehmer ist mit `tickets` Losen
 * im Topf, kann aber nur einmal gewinnen. Zieht `count` eindeutige Gewinner aus
 * dem `candidates`-Pool.
 */
function weightedDraw(
  candidates: { userId: string; tickets: number }[],
  count: number,
): string[] {
  const pool = candidates.map((c) => ({ userId: c.userId, tickets: Math.max(1, c.tickets) }));
  const winners: string[] = [];
  while (winners.length < count && pool.length > 0) {
    const total = pool.reduce((s, c) => s + c.tickets, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i]!.tickets;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    winners.push(pool[idx]!.userId);
    pool.splice(idx, 1); // ohne Zurücklegen
  }
  return winners;
}

/** Schickt einem Gewinner die DM (falls erlaubt) und liefert den Status zurück. */
async function notifyWinner(
  client: Client,
  userId: string,
  prize: string,
  code: string | null,
): Promise<"sent" | "failed" | "disabled"> {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { giveawayWinDm: true },
  });
  if (member && !member.giveawayWinDm) return "disabled";
  try {
    const user = await client.users.fetch(userId);
    const codeBlock = code
      ? `\n\n**Dein Code:**\n\`\`\`\n${code}\n\`\`\``
      : "\nMelde dich beim Team, um deinen Gewinn zu erhalten.";
    await user.send(`🎉 Glückwunsch! Du hast bei einem Giveaway **${prize}** gewonnen.${codeBlock}`);
    return "sent";
  } catch {
    return "failed"; // DMs gesperrt — Host sieht den Code im Dashboard
  }
}

/** Codes (eine Zeile pro Code) aus dem rewardCode-Feld. */
function parseCodes(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split("\n").map((c) => c.trim()).filter(Boolean);
}

/** Zieht (gewichtet) die Gewinner, weist Codes zu und benachrichtigt sie. */
export async function drawWinners(client: Client, id: number): Promise<{ winners: string[] }> {
  const g = await fetchGiveaway(id);
  if (!g) return { winners: [] };

  // Vorherige Gewinner/Codes/DM-Status zurücksetzen (auch für Reroll).
  await prisma.giveawayEntry.updateMany({
    where: { giveawayId: id },
    data: { isWinner: false, assignedCode: null, dmStatus: null },
  });

  const winners = weightedDraw(g.entries, g.winnerCount);
  const codes = parseCodes(g.rewardCode);

  await prisma.giveaway.update({ where: { id }, data: { ended: true } });

  // Pro Gewinner: Code zuweisen, DM schicken, Status speichern.
  for (let i = 0; i < winners.length; i++) {
    const userId = winners[i]!;
    const code = codes[i] ?? null;
    const status = await notifyWinner(client, userId, g.prize, code);
    await prisma.giveawayEntry.update({
      where: { giveawayId_userId: { giveawayId: id, userId } },
      data: { isWinner: true, assignedCode: code, dmStatus: status },
    });
  }

  await refreshGiveawayMessage(client, id);

  // Gewinner-Ankündigung im Channel
  const channel = await client.channels.fetch(g.channelId).catch(() => null);
  if (channel?.isTextBased() && "send" in channel) {
    const link = g.messageId
      ? `https://discord.com/channels/${env.DISCORD_GUILD_ID}/${g.channelId}/${g.messageId}`
      : "";
    const text =
      winners.length > 0
        ? `🎉 Glückwunsch ${winners.map((w) => `<@${w}>`).join(", ")} — ihr habt **${g.prize}** gewonnen!${link ? `\n${link}` : ""}`
        : `Das Giveaway **${g.prize}** ist beendet — leider gab es keine gültigen Teilnehmer.`;
    await (channel as TextChannel)
      .send({ content: text, allowedMentions: { users: winners } })
      .catch(() => null);
  }

  return { winners };
}

/** Ersetzt EINEN Gewinner durch einen neuen Teilnehmer (für „nicht reagiert"-Fälle). */
export async function rerollSingleWinner(
  client: Client,
  id: number,
  oldUserId: string,
): Promise<{ ok: true; newWinner: string | null } | { ok: false; error: string }> {
  const g = await fetchGiveaway(id);
  if (!g) return { ok: false, error: "Giveaway nicht gefunden." };

  const current = g.entries.filter((e) => e.isWinner).map((e) => e.userId);
  if (!current.includes(oldUserId)) return { ok: false, error: "Dieser User ist kein Gewinner." };

  // Kandidaten: Teilnehmer, die nicht bereits gewinnen.
  const candidates = g.entries.filter((e) => !current.includes(e.userId));
  const [newWinner] = weightedDraw(candidates, 1);

  // Alten Gewinner entfernen
  await prisma.giveawayEntry.update({
    where: { giveawayId_userId: { giveawayId: id, userId: oldUserId } },
    data: { isWinner: false, assignedCode: null, dmStatus: null },
  });

  let newWinnerId: string | null = null;
  if (newWinner) {
    newWinnerId = newWinner;
    // Code des alten Gewinners übernehmen (falls zugewiesen).
    const old = g.entries.find((e) => e.userId === oldUserId) as { assignedCode?: string } | undefined;
    const code = (old?.assignedCode as string | undefined) ?? null;
    const status = await notifyWinner(client, newWinner, g.prize, code);
    await prisma.giveawayEntry.update({
      where: { giveawayId_userId: { giveawayId: id, userId: newWinner } },
      data: { isWinner: true, assignedCode: code, dmStatus: status },
    });
    const channel = await client.channels.fetch(g.channelId).catch(() => null);
    if (channel?.isTextBased() && "send" in channel) {
      await (channel as TextChannel)
        .send({
          content: `🔁 Neuer Gewinner für **${g.prize}**: <@${newWinner}> (ersetzt <@${oldUserId}>)`,
          allowedMentions: { users: [newWinner] },
        })
        .catch(() => null);
    }
  }

  await refreshGiveawayMessage(client, id);
  return { ok: true, newWinner: newWinnerId };
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let running = false;

async function tick(client: Client): Promise<void> {
  if (running) return;
  running = true;
  try {
    const due = await prisma.giveaway.findMany({
      where: { ended: false, endsAt: { lte: new Date() } },
      select: { id: true },
    });
    for (const g of due) {
      await drawWinners(client, g.id);
    }
    // Bei jedem Tick aufzeichnen (auch ohne fällige Giveaways), damit Bot Health
    // einen aktuellen „zuletzt geprüft"-Zeitstempel zeigt.
    recordSchedulerRun("Giveaways", {
      ok: true,
      details: due.length > 0 ? `${due.length} beendet` : "keine fällig",
    });
  } catch (err) {
    recordSchedulerRun("Giveaways", { ok: false, details: String(err) });
    logger.error({ err }, "Giveaway-Scheduler-Fehler");
  } finally {
    running = false;
  }
}

export function startGiveawayScheduler(client: Client): void {
  if (intervalId) return;
  registerScheduler("Giveaways", CHECK_INTERVAL_MS);
  void tick(client);
  intervalId = setInterval(() => void tick(client), CHECK_INTERVAL_MS);
  logger.info("Giveaway-Scheduler gestartet");
}
