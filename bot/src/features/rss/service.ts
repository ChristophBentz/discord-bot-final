import type { Client, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { fetchAndParseFeed, type FeedItem, type ParsedFeed } from "./parser.js";

const MAX_INITIAL_POST_COUNT = 3; // Bei einem brandneuen Feed nicht die ganze History dumpen.
const MAX_POST_PER_RUN = 5;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function fav(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function hostnameOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function buildEmbed(item: FeedItem, feed: ParsedFeed, feedName: string): EmbedBuilder {
  const sourceHost = hostnameOf(item.link) ?? hostnameOf(feed.link);
  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(truncate(item.title, 256))
    .setAuthor({
      name: feedName,
      iconURL: sourceHost ? fav(sourceHost) : undefined,
      url: feed.link ?? undefined,
    });

  if (item.link) embed.setURL(item.link);
  if (item.description) {
    embed.setDescription(truncate(item.description, 500));
  }
  const image = item.imageUrl ?? feed.imageUrl;
  if (image) embed.setImage(image);
  if (item.author) {
    embed.addFields({ name: "Autor", value: truncate(item.author, 100), inline: true });
  }
  if (item.pubDate) {
    embed.setTimestamp(item.pubDate);
  }
  const footerText = sourceHost ?? feedName;
  embed.setFooter({
    text: footerText,
    iconURL: sourceHost ? fav(sourceHost) : undefined,
  });
  return embed;
}

export interface FeedCheckResult {
  posted: number;
  skipped: number;
  fetched: number;
  initial: boolean;
}

export async function checkFeed(client: Client, feedId: number): Promise<FeedCheckResult> {
  const feed = await prisma.rssFeed.findUnique({ where: { id: feedId } });
  if (!feed) throw new Error("Feed nicht gefunden");
  if (!feed.enabled) {
    return { posted: 0, skipped: 0, fetched: 0, initial: false };
  }

  let parsed: ParsedFeed;
  try {
    parsed = await fetchAndParseFeed(feed.url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.rssFeed.update({
      where: { id: feed.id },
      data: { lastCheck: new Date(), lastError: msg.slice(0, 500) },
    });
    throw err;
  }

  const channel = await client.channels.fetch(feed.channelId).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) {
    await prisma.rssFeed.update({
      where: { id: feed.id },
      data: { lastCheck: new Date(), lastError: "Channel nicht gefunden oder kein Text-Channel." },
    });
    return { posted: 0, skipped: 0, fetched: parsed.items.length, initial: false };
  }

  const existingCount = await prisma.rssFeedItem.count({ where: { feedId: feed.id } });
  const isInitial = existingCount === 0;

  // Nach Datum sortieren (neueste zuerst); bei fehlendem Datum Reihenfolge beibehalten.
  const sorted = [...parsed.items].sort((a, b) => {
    const at = a.pubDate?.getTime() ?? 0;
    const bt = b.pubDate?.getTime() ?? 0;
    return bt - at;
  });

  const guids = sorted.map((i) => i.guid);
  const known = new Set(
    (
      await prisma.rssFeedItem.findMany({
        where: { feedId: feed.id, guid: { in: guids } },
        select: { guid: true },
      })
    ).map((i) => i.guid),
  );

  let candidates = sorted.filter((i) => !known.has(i.guid));

  // Beim allerersten Lauf: nur die N neuesten posten, Rest stumm als „gesehen" markieren.
  let silentMark: FeedItem[] = [];
  if (isInitial && candidates.length > MAX_INITIAL_POST_COUNT) {
    silentMark = candidates.slice(MAX_INITIAL_POST_COUNT);
    candidates = candidates.slice(0, MAX_INITIAL_POST_COUNT);
  }

  // Pro Lauf maximal MAX_POST_PER_RUN posten (gegen Spam bei sehr aktiven Feeds).
  if (candidates.length > MAX_POST_PER_RUN) {
    silentMark = silentMark.concat(candidates.slice(MAX_POST_PER_RUN));
    candidates = candidates.slice(0, MAX_POST_PER_RUN);
  }

  // Reihenfolge zum Posten: chronologisch (alt → neu), damit neueste oben im Channel landen.
  candidates.reverse();

  let posted = 0;
  for (const item of candidates) {
    try {
      const rolePing = feed.pingRoleId ? `<@&${feed.pingRoleId}>` : "";
      const sent = await (channel as TextChannel).send({
        content: rolePing || undefined,
        embeds: [buildEmbed(item, parsed, feed.name)],
        allowedMentions: feed.pingRoleId ? { roles: [feed.pingRoleId] } : { parse: [] },
      });
      await prisma.rssFeedItem.create({
        data: {
          feedId: feed.id,
          guid: item.guid,
          title: item.title,
          link: item.link,
          messageId: sent.id,
        },
      });
      posted += 1;
    } catch (err) {
      logger.warn({ err, feedId: feed.id, title: item.title }, "RSS: Posten fehlgeschlagen");
    }
  }

  // Stumm markieren (alle restlichen Kandidaten + Initial-Übersprünge).
  if (silentMark.length > 0) {
    await prisma.rssFeedItem.createMany({
      data: silentMark.map((i) => ({
        feedId: feed.id,
        guid: i.guid,
        title: i.title,
        link: i.link,
      })),
    });
  }

  await prisma.rssFeed.update({
    where: { id: feed.id },
    data: { lastCheck: new Date(), lastError: null },
  });

  return {
    posted,
    skipped: known.size + silentMark.length,
    fetched: sorted.length,
    initial: isInitial,
  };
}

export async function checkAllDueFeeds(client: Client): Promise<{ checked: number; posted: number }> {
  const feeds = await prisma.rssFeed.findMany({ where: { enabled: true } });
  const now = Date.now();
  let checked = 0;
  let posted = 0;
  for (const feed of feeds) {
    const intervalMs = Math.max(1, feed.intervalMin) * 60_000;
    const due = !feed.lastCheck || now - feed.lastCheck.getTime() >= intervalMs;
    if (!due) continue;
    try {
      const r = await checkFeed(client, feed.id);
      checked += 1;
      posted += r.posted;
    } catch (err) {
      logger.warn({ err, feedId: feed.id, url: feed.url }, "RSS-Check fehlgeschlagen");
    }
  }
  return { checked, posted };
}

let intervalId: ReturnType<typeof setInterval> | null = null;
const TICK_MS = 60_000; // Jede Minute prüfen, welche Feeds dran sind.

export function startRssScheduler(client: Client): void {
  if (intervalId) return;
  // Erster Lauf nach 20s.
  setTimeout(() => {
    void checkAllDueFeeds(client).catch((err) =>
      logger.error({ err }, "RSS-Scheduler-Lauf fehlgeschlagen"),
    );
  }, 20_000);
  intervalId = setInterval(() => {
    void checkAllDueFeeds(client).catch((err) =>
      logger.error({ err }, "RSS-Scheduler-Lauf fehlgeschlagen"),
    );
  }, TICK_MS);
  logger.info({ tickMs: TICK_MS }, "RSS-Scheduler gestartet");
}
