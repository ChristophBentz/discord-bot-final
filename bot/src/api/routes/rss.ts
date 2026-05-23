import type { Client } from "discord.js";
import { checkFeed } from "../../features/rss/service.js";
import { fetchAndParseFeed } from "../../features/rss/parser.js";

export interface TestBody {
  url?: string;
}

export async function handleRssCheck(
  client: Client,
  feedId: number,
):
  | Promise<
      | { ok: true; posted: number; skipped: number; fetched: number; initial: boolean }
      | { ok: false; error: string }
    > {
  try {
    const r = await checkFeed(client, feedId);
    return { ok: true, ...r };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function handleRssTest(
  body: TestBody,
): Promise<
  | {
      ok: true;
      title: string | null;
      link: string | null;
      feedImageUrl: string | null;
      itemCount: number;
      sample: {
        title: string;
        link: string | null;
        description: string | null;
        imageUrl: string | null;
        author: string | null;
        pubDate: string | null;
      } | null;
    }
  | { ok: false; error: string }
> {
  const url = String(body.url ?? "").trim();
  if (!url) return { ok: false, error: "URL fehlt." };
  try {
    new URL(url);
  } catch {
    return { ok: false, error: "Ungültige URL." };
  }
  try {
    const parsed = await fetchAndParseFeed(url);
    const first = parsed.items[0] ?? null;
    return {
      ok: true,
      title: parsed.title,
      link: parsed.link,
      feedImageUrl: parsed.imageUrl,
      itemCount: parsed.items.length,
      sample: first
        ? {
            title: first.title,
            link: first.link,
            description: first.description,
            imageUrl: first.imageUrl ?? parsed.imageUrl,
            author: first.author,
            pubDate: first.pubDate ? first.pubDate.toISOString() : null,
          }
        : null,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
