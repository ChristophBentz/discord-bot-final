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
  entries: { userId: string; isWinner: boolean }[];
}

/** Baut Embed + Teilnahme-Button für eine Giveaway-Nachricht. */
export function buildGiveawayMessage(g: GiveawayWithEntries): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const entryCount = g.entries.length;
  const winners = g.entries.filter((e) => e.isWinner).map((e) => e.userId);

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
    include: { entries: { select: { userId: true, isWinner: true } } },
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

/** Zieht zufällig Gewinner und benachrichtigt sie (DM, falls erlaubt). */
export async function drawWinners(client: Client, id: number): Promise<{ winners: string[] }> {
  const g = await fetchGiveaway(id);
  if (!g) return { winners: [] };

  // Bei Reroll vorherige Gewinner zurücksetzen.
  await prisma.giveawayEntry.updateMany({ where: { giveawayId: id }, data: { isWinner: false } });

  const pool = g.entries.map((e) => e.userId);
  // Fisher-Yates-Shuffle, dann die ersten winnerCount nehmen.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const winners = pool.slice(0, g.winnerCount);

  if (winners.length > 0) {
    await prisma.giveawayEntry.updateMany({
      where: { giveawayId: id, userId: { in: winners } },
      data: { isWinner: true },
    });
  }
  await prisma.giveaway.update({ where: { id }, data: { ended: true } });
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

  // Optionale DM an Gewinner (nur wenn deren giveawayWinDm an ist).
  // Ein hinterlegter Reward-Code wird direkt in der DM mitgeschickt.
  for (const userId of winners) {
    const member = await prisma.member.findUnique({
      where: { userId },
      select: { giveawayWinDm: true },
    });
    if (member && !member.giveawayWinDm) continue;
    try {
      const user = await client.users.fetch(userId);
      const codeBlock = g.rewardCode
        ? `\n\n**Dein Code:**\n\`\`\`\n${g.rewardCode}\n\`\`\``
        : "\nMelde dich beim Team, um deinen Gewinn zu erhalten.";
      await user.send(
        `🎉 Glückwunsch! Du hast bei einem Giveaway **${g.prize}** gewonnen.${codeBlock}`,
      );
    } catch {
      /* DMs gesperrt — ignorieren; Host sieht den Code im Dashboard */
    }
  }

  return { winners };
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
    if (due.length > 0) {
      recordSchedulerRun("Giveaways", { ok: true, details: `${due.length} beendet` });
    }
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
