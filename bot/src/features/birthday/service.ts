import type { Client, TextChannel } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { registerScheduler, recordSchedulerRun } from "../../lib/healthBuffer.js";
import { env } from "../../lib/env.js";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // alle 10 Min prüfen; Datums-Key verhindert Doppelposts

/** Lokaler Datums-Key YYYY-MM-DD (Serverzeit). */
function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Alter am heutigen Tag aus dem Geburtsjahr (oder null). */
export function ageFromBirthday(day: number, month: number, year: number | null): number | null {
  if (!year) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  // Geburtstag im laufenden Jahr noch nicht erreicht?
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

interface BirthdayMember {
  userId: string;
  displayName: string;
  birthdayDay: number | null;
  birthdayMonth: number | null;
  birthdayYear: number | null;
}

function renderMessage(template: string | null, mention: string, age: number | null): string {
  const base = template?.trim()
    ? template
    : "🎉 Alles Gute zum Geburtstag, {user}!{age}";
  return base
    .replaceAll("{user}", mention)
    .replaceAll("{age}", age !== null ? ` 🎂 ${age} Jahre!` : "");
}

async function announceBirthdays(client: Client): Promise<{ posted: number }> {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  if (!config?.birthdayEnabled || !config.birthdayChannelId) return { posted: 0 };

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;

  const members = (await prisma.member.findMany({
    where: {
      inServer: true,
      birthdayDay: day,
      birthdayMonth: month,
      birthdayAnnounce: true,
    },
    select: {
      userId: true,
      displayName: true,
      birthdayDay: true,
      birthdayMonth: true,
      birthdayYear: true,
    },
  })) as BirthdayMember[];

  if (members.length === 0) return { posted: 0 };

  const channel = await client.channels.fetch(config.birthdayChannelId).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) {
    logger.warn({ channelId: config.birthdayChannelId }, "Geburtstags-Channel ungültig");
    return { posted: 0 };
  }

  const ping = config.birthdayPingRoleId ? `<@&${config.birthdayPingRoleId}> ` : "";
  let posted = 0;
  for (const m of members) {
    const age = ageFromBirthday(m.birthdayDay!, m.birthdayMonth!, m.birthdayYear);
    const text = ping + renderMessage(config.birthdayMessage, `<@${m.userId}>`, age);
    try {
      await (channel as TextChannel).send({
        content: text,
        allowedMentions: { users: [m.userId], roles: config.birthdayPingRoleId ? [config.birthdayPingRoleId] : [] },
      });
      posted += 1;
    } catch (err) {
      logger.warn({ err, userId: m.userId }, "Geburtstags-Post fehlgeschlagen");
    }
  }
  return { posted };
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let running = false;

async function tick(client: Client): Promise<void> {
  if (running) return;
  running = true;
  try {
    const today = dateKey();
    const config = await prisma.config.findUnique({
      where: { id: 1 },
      select: { birthdayLastRun: true },
    });
    if (config?.birthdayLastRun === today) return; // heute schon angekündigt

    const { posted } = await announceBirthdays(client);
    await prisma.config.update({ where: { id: 1 }, data: { birthdayLastRun: today } });
    recordSchedulerRun("Geburtstage", {
      ok: true,
      details: posted > 0 ? `${posted} Geburtstag(e) angekündigt` : "keine Geburtstage heute",
    });
  } catch (err) {
    recordSchedulerRun("Geburtstage", { ok: false, details: String(err) });
    logger.error({ err }, "Geburtstags-Scheduler-Fehler");
  } finally {
    running = false;
  }
}

export function startBirthdayScheduler(client: Client): void {
  if (intervalId) return;
  if (!env.DISCORD_GUILD_ID) return;
  registerScheduler("Geburtstage", CHECK_INTERVAL_MS);
  // Direkt einmal prüfen (fängt verpasste Tage nach Neustart ab), dann periodisch.
  void tick(client);
  intervalId = setInterval(() => void tick(client), CHECK_INTERVAL_MS);
  logger.info("Geburtstags-Scheduler gestartet");
}
