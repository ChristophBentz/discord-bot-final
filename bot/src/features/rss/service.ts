import type { Client, TextChannel } from "discord.js";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { registerScheduler, recordSchedulerRun } from "../../lib/healthBuffer.js";
import { fetchAndParseFeed, type FeedItem, type ParsedFeed } from "./parser.js";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Versucht das Bild selbst zu laden — wenn das klappt, hängen wir es als
// Attachment an den Embed, damit's über Discord's CDN ausgeliefert wird.
// Hintergrund: viele Seiten (z.B. Cloudflare-geschützte) blockieren Discord's
// Image-Fetcher, das eigene Hosting umgeht das.
async function fetchImageAttachment(
  url: string,
): Promise<{ attachment: AttachmentBuilder; filename: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 8 * 1024 * 1024) return null;
    const ext = contentType.split(";")[0]!.split("/")[1] ?? "png";
    const filename = `image.${ext.replace(/[^a-z0-9]/g, "") || "png"}`;
    return { attachment: new AttachmentBuilder(buf, { name: filename }), filename };
  } catch {
    return null;
  }
}

const MAX_INITIAL_POST_COUNT = 3; // Bei einem brandneuen Feed nicht die ganze History dumpen.

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

function buildEmbed(
  item: FeedItem,
  feed: ParsedFeed,
  feedName: string,
  imageRef: string | null,
): EmbedBuilder {
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
  if (imageRef) {
    embed.setImage(imageRef);
  }
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
  const initialCandidatesCount = candidates.length;

  // Beim allerersten Lauf: nur die N neuesten posten, Rest stumm als „gesehen" markieren.
  let silentMark: FeedItem[] = [];
  if (isInitial && candidates.length > MAX_INITIAL_POST_COUNT) {
    silentMark = candidates.slice(MAX_INITIAL_POST_COUNT);
    candidates = candidates.slice(0, MAX_INITIAL_POST_COUNT);
  }

  // Pro Lauf maximal feed.maxPostsPerRun posten (gegen Spam bei sehr aktiven Feeds).
  const maxPerRun = Math.max(1, feed.maxPostsPerRun);
  if (candidates.length > maxPerRun) {
    silentMark = silentMark.concat(candidates.slice(maxPerRun));
    candidates = candidates.slice(0, maxPerRun);
  }

  if (initialCandidatesCount > 0) {
    logger.info(
      `RSS-Detail [${feed.id}] "${feed.name}": dbBefore=${existingCount} fetched=${sorted.length} newCandidates=${initialCandidatesCount} willPost=${candidates.length} willSilent=${silentMark.length} maxPerRun=${maxPerRun} initial=${isInitial}`,
    );
  }

  // Reihenfolge zum Posten: chronologisch (alt → neu), damit neueste oben im Channel landen.
  candidates.reverse();

  let posted = 0;
  let postFailed = 0;
  for (const item of candidates) {
    try {
      const rolePing = feed.pingRoleId ? `<@&${feed.pingRoleId}>` : "";
      const imageUrl = item.imageUrl ?? parsed.imageUrl;
      const attached = imageUrl ? await fetchImageAttachment(imageUrl) : null;
      const imageRef = attached ? `attachment://${attached.filename}` : (imageUrl ?? null);
      const sent = await (channel as TextChannel).send({
        content: rolePing || undefined,
        embeds: [buildEmbed(item, parsed, feed.name, imageRef)],
        files: attached ? [attached.attachment] : undefined,
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
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      postFailed += 1;
      logger.warn(
        `RSS Post fehlgeschlagen [${feed.id}] title="${item.title.slice(0, 50)}" code=${e?.code} msg=${e?.message}`,
      );
    }
  }

  // Stumm markieren (alle restlichen Kandidaten + Initial-Übersprünge).
  if (silentMark.length > 0) {
    try {
      await prisma.rssFeedItem.createMany({
        data: silentMark.map((i) => ({
          feedId: feed.id,
          guid: i.guid,
          title: i.title,
          link: i.link,
        })),
      });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      logger.warn(
        `RSS SilentMark fehlgeschlagen [${feed.id}] code=${e?.code} msg=${e?.message}`,
      );
    }
  }

  if (postFailed > 0) {
    logger.warn(
      `RSS [${feed.id}] "${feed.name}": ${postFailed} Posts sind fehlgeschlagen — siehe Warnungen oben`,
    );
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

export async function checkAllDueFeeds(client: Client): Promise<{ checked: number; posted: number; total: number; dueCount: number }> {
  const feeds = await prisma.rssFeed.findMany({ where: { enabled: true } });
  const now = Date.now();
  let checked = 0;
  let posted = 0;
  let dueCount = 0;
  for (const feed of feeds) {
    const intervalMs = Math.max(1, feed.intervalMin) * 60_000;
    const lastCheckMs = feed.lastCheck?.getTime() ?? 0;
    const due = !feed.lastCheck || now - lastCheckMs >= intervalMs;
    if (!due) continue;
    dueCount += 1;
    try {
      const r = await checkFeed(client, feed.id);
      checked += 1;
      posted += r.posted;
      logger.info(
        `RSS-Check [${feed.id}] "${feed.name}": ${r.posted} gepostet, ${r.skipped} bekannt, ${r.fetched} gefunden${r.initial ? " (initial)" : ""}`,
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      logger.warn(`RSS-Check fehlgeschlagen [${feed.id}] "${feed.name}" url=${feed.url} msg=${e?.message}`);
    }
  }
  return { checked, posted, total: feeds.length, dueCount };
}

let intervalId: ReturnType<typeof setInterval> | null = null;
const TICK_MS = 60_000; // Jede Minute prüfen, welche Feeds dran sind.

async function runTick(client: Client, label: string): Promise<void> {
  try {
    const r = await checkAllDueFeeds(client);
    if (r.dueCount > 0) {
      logger.info(`RSS-Tick (${label}): ${r.checked}/${r.total} geprüft, ${r.posted} gepostet`);
    }
    recordSchedulerRun("RSS-Feeds", {
      ok: true,
      details: `${r.checked}/${r.total} geprüft · ${r.posted} gepostet`,
    });
  } catch (err) {
    logger.error({ err }, `RSS-Tick (${label}) fehlgeschlagen`);
    recordSchedulerRun("RSS-Feeds", { ok: false, details: String(err) });
  }
}

export function startRssScheduler(client: Client): void {
  if (intervalId) return;
  registerScheduler("RSS-Feeds", TICK_MS);
  // Erster Lauf nach 20s.
  setTimeout(() => void runTick(client, "initial"), 20_000);
  intervalId = setInterval(() => void runTick(client, "interval"), TICK_MS);
  logger.info(`RSS-Scheduler gestartet (tick alle ${TICK_MS / 1000}s)`);
}
