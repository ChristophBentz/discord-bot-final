import type { Client, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getConfig, prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { registerScheduler, recordSchedulerRun } from "../../lib/healthBuffer.js";

interface Giveaway {
  id: number;
  title: string;
  worth: string;
  thumbnail: string;
  image: string;
  description: string;
  instructions: string;
  open_giveaway_url: string;
  published_date: string;
  type: string;
  platforms: string;
  end_date: string;
  users: number;
  status: string;
  gamerpower_url: string;
}

// Substring-Matches gegen den lowercase platforms-String. GamerPower
// liefert die Werte mit Leerzeichen (z.B. "Epic Games Store",
// "Playstation 4", "Xbox One") — NICHT mit Bindestrichen.
const PLATFORM_KEYS = {
  epic: ["epic games store", "epic"],
  steam: ["steam"],
  gog: ["gog"],
  console: [
    "playstation 4",
    "playstation 5",
    "ps4",
    "ps5",
    "xbox one",
    "xbox series",
    "nintendo switch",
  ],
} as const;

function matchesPlatform(
  platforms: string,
  flags: { epic: boolean; steam: boolean; gog: boolean; console: boolean },
): boolean {
  const lower = platforms.toLowerCase();
  if (flags.epic && PLATFORM_KEYS.epic.some((k) => lower.includes(k))) return true;
  if (flags.steam && PLATFORM_KEYS.steam.some((k) => lower.includes(k))) return true;
  if (flags.gog && PLATFORM_KEYS.gog.some((k) => lower.includes(k))) return true;
  if (flags.console && PLATFORM_KEYS.console.some((k) => lower.includes(k))) return true;
  return false;
}

// GamerPower Types: "Game", "DLC", "Early Access", "Other" (für Beta-Keys etc.).
// Wir mappen Early-Access + Other unter "games", weil sie meistens spielbare
// Inhalte sind die User auch sehen wollen.
function matchesType(
  type: string,
  flags: { games: boolean; dlc: boolean; loot: boolean },
): boolean {
  const t = type.toLowerCase();
  if (flags.games && (t === "game" || t === "early access" || t === "other")) return true;
  if (flags.dlc && t === "dlc") return true;
  if (flags.loot && (t === "loot" || t === "in-game loot")) return true;
  return false;
}

function colorForPlatform(platforms: string): number {
  const p = platforms.toLowerCase();
  if (p.includes("epic")) return 0x2a2a2a;
  if (p.includes("steam")) return 0x1b2838;
  if (p.includes("gog")) return 0x86328a;
  if (p.includes("xbox")) return 0x107c10;
  if (p.includes("playstation")) return 0x0070d1;
  if (p.includes("nintendo")) return 0xe60012;
  return 0xa855f7;
}

// Google Favicon-API liefert PNG (nach Redirect). Discord-kompatibel, kein Key nötig.
function fav(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function iconForPlatform(platforms: string): { name: string; iconURL: string } {
  const p = platforms.toLowerCase();
  if (p.includes("epic")) return { name: "Epic Games Store", iconURL: fav("store.epicgames.com") };
  if (p.includes("steam")) return { name: "Steam", iconURL: fav("store.steampowered.com") };
  if (p.includes("gog")) return { name: "GOG", iconURL: fav("www.gog.com") };
  if (p.includes("xbox")) return { name: "Xbox", iconURL: fav("www.xbox.com") };
  if (p.includes("playstation") || p.includes("ps4") || p.includes("ps5"))
    return { name: "PlayStation", iconURL: fav("store.playstation.com") };
  if (p.includes("nintendo")) return { name: "Nintendo", iconURL: fav("www.nintendo.com") };
  if (p.includes("ubisoft")) return { name: "Ubisoft", iconURL: fav("store.ubisoft.com") };
  return { name: platforms, iconURL: fav("www.gamerpower.com") };
}

async function fetchGiveaways(): Promise<Giveaway[]> {
  const res = await fetch("https://www.gamerpower.com/api/giveaways", {
    headers: { "User-Agent": "DiscordBot/1.0" },
    cache: "no-store" as RequestCache,
  });
  if (!res.ok) {
    throw new Error(`GamerPower antwortete mit ${res.status}`);
  }
  return (await res.json()) as Giveaway[];
}

function buildEmbed(
  g: Giveaway,
  footerText: string | null,
  footerIconUrl: string | null,
): EmbedBuilder {
  const icon = iconForPlatform(g.platforms);
  const embed = new EmbedBuilder()
    .setColor(colorForPlatform(g.platforms))
    .setAuthor({ name: icon.name, iconURL: icon.iconURL })
    .setTitle(g.title)
    .setURL(g.open_giveaway_url || g.gamerpower_url)
    .setDescription(g.description.length > 400 ? g.description.slice(0, 397) + "…" : g.description)
    .addFields(
      { name: "Wert", value: g.worth && g.worth !== "N/A" ? g.worth : "Kostenlos", inline: true },
      { name: "Plattform", value: g.platforms || "—", inline: true },
      { name: "Typ", value: g.type || "—", inline: true },
    );
  if (g.end_date && g.end_date !== "N/A") {
    embed.addFields({ name: "Endet", value: g.end_date, inline: false });
  }
  if (g.image) embed.setImage(g.image);
  else if (g.thumbnail) embed.setThumbnail(g.thumbnail);
  if (footerText) {
    embed.setFooter({ text: footerText, iconURL: footerIconUrl ?? undefined });
  }
  return embed;
}

export interface CheckResult {
  posted: number;
  skipped: number;
  fetched: number;
  channelMissing: boolean;
  disabled?: boolean;
}

export async function checkAndPostFreeGames(client: Client): Promise<CheckResult> {
  const config = await getConfig();
  if (!config.freeGamesEnabled) {
    return { posted: 0, skipped: 0, fetched: 0, channelMissing: false, disabled: true };
  }
  if (!config.freeGamesChannelId) {
    return { posted: 0, skipped: 0, fetched: 0, channelMissing: true };
  }

  const channel = await client.channels.fetch(config.freeGamesChannelId).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) {
    return { posted: 0, skipped: 0, fetched: 0, channelMissing: true };
  }

  const giveaways = await fetchGiveaways();
  const platformFlags = {
    epic: config.freeGamesEpic,
    steam: config.freeGamesSteam,
    gog: config.freeGamesGog,
    console: config.freeGamesConsole,
  };
  const typeFlags = {
    games: config.freeGamesIncludeGames,
    dlc: config.freeGamesIncludeDlc,
    loot: config.freeGamesIncludeLoot,
  };

  // Active filter: only currently active giveaways
  const active = giveaways.filter(
    (g) =>
      g.status?.toLowerCase() === "active" &&
      matchesPlatform(g.platforms, platformFlags) &&
      matchesType(g.type, typeFlags),
  );

  const ids = active.map((g) => g.id);
  const already = new Set(
    (
      await prisma.freeGamePost.findMany({
        where: { giveawayId: { in: ids } },
        select: { giveawayId: true },
      })
    ).map((p) => p.giveawayId),
  );

  const toPost = active.filter((g) => !already.has(g.id));
  const skipped = active.length - toPost.length;
  let posted = 0;

  // Falls Intro-Nachricht oder Ping konfiguriert → einmal vorab posten.
  if (toPost.length > 0 && (config.freeGamesMessage || config.freeGamesPingRoleId)) {
    try {
      const rolePing = config.freeGamesPingRoleId ? `<@&${config.freeGamesPingRoleId}>` : "";
      const text = (config.freeGamesMessage ?? "")
        .replaceAll("{role}", rolePing)
        .replaceAll("{count}", String(toPost.length));
      const finalContent = text.trim() || rolePing;
      if (finalContent) {
        await (channel as TextChannel).send({
          content: finalContent,
          allowedMentions: config.freeGamesPingRoleId
            ? { roles: [config.freeGamesPingRoleId] }
            : { parse: [] },
        });
      }
    } catch (err) {
      logger.warn({ err }, "Free-Games: Intro-Nachricht fehlgeschlagen");
    }
  }

  for (const g of toPost) {
    try {
      const msg = await (channel as TextChannel).send({
        embeds: [buildEmbed(g, config.freeGamesFooterText, config.guildIconUrl)],
      });
      await prisma.freeGamePost.create({
        data: {
          giveawayId: g.id,
          title: g.title,
          platform: g.platforms,
          messageId: msg.id,
        },
      });
      posted += 1;
    } catch (err) {
      logger.warn({ err, id: g.id, title: g.title }, "Free-Games: Posten fehlgeschlagen");
    }
  }

  await prisma.config.update({
    where: { id: 1 },
    data: { freeGamesLastCheck: new Date() },
  });

  logger.info(
    `Free-Games-Check fertig: ${posted} gepostet, ${skipped} bekannt, ${active.length} matched (von ${giveaways.length} total)`,
  );
  return { posted, skipped, fetched: active.length, channelMissing: false };
}

let intervalId: ReturnType<typeof setInterval> | null = null;
const INTERVAL_MS = 60 * 60 * 1000; // 1h — Dedup verhindert Doppel-Posts

async function runCheck(client: Client) {
  try {
    const r = await checkAndPostFreeGames(client);
    recordSchedulerRun("Free-Games", {
      ok: true,
      details: `${r.fetched} aktiv · ${r.posted} neu gepostet · ${r.skipped} bekannt`,
    });
  } catch (err) {
    logger.error({ err }, "Free-Games-Check fehlgeschlagen");
    recordSchedulerRun("Free-Games", { ok: false, details: String(err) });
  }
}

export function startFreeGamesScheduler(client: Client): void {
  if (intervalId) return;
  registerScheduler("Free-Games", INTERVAL_MS);
  setTimeout(() => void runCheck(client), 30_000);
  intervalId = setInterval(() => void runCheck(client), INTERVAL_MS);
  logger.info(`Free-Games-Scheduler gestartet (Check alle ${INTERVAL_MS / 60_000} Min)`);
}
