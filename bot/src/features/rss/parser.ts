// Minimalistischer RSS/Atom-Parser ohne externe Dependencies.
// Unterstützt RSS 2.0 (<item>), RDF (<item>), und Atom (<entry>).

import { checkFetchUrl } from "../../lib/safeUrl.js";

export interface FeedItem {
  guid: string;
  title: string;
  link: string | null;
  description: string | null;
  pubDate: Date | null;
  imageUrl: string | null;
  author: string | null;
}

export interface ParsedFeed {
  title: string | null;
  link: string | null;
  description: string | null;
  imageUrl: string | null;
  items: FeedItem[];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function stripCdata(s: string): string {
  const m = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return m ? m[1]! : s;
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clean(s: string | null | undefined): string | null {
  if (!s) return null;
  const decoded = decodeEntities(stripCdata(s));
  const text = stripHtml(decoded).trim();
  return text || null;
}

// Tag-Inhalt holen — case-insensitiv, erstes Vorkommen.
function tag(xml: string, name: string): string | null {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const m = xml.match(re);
  return m ? m[1]! : null;
}

// Alle Tags eines Namens.
function allTags(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]!);
  return out;
}

// Attribut aus einem Self-closing- oder Open-Tag holen, z.B. <link href="..."/>.
function attr(xml: string, tagName: string, attrName: string): string | null {
  const re = new RegExp(`<${tagName}\\s[^>]*\\b${attrName}\\s*=\\s*"([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1]! : null;
}

// Atom <link rel="alternate" href="..."/> bevorzugen, sonst erstes href.
function atomLink(xml: string): string | null {
  const linkRe = /<link\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  let fallback: string | null = null;
  while ((m = linkRe.exec(xml)) !== null) {
    const attrs = m[1]!;
    const href = attrs.match(/\bhref\s*=\s*"([^"]*)"/i)?.[1] ?? null;
    if (!href) continue;
    const rel = attrs.match(/\brel\s*=\s*"([^"]*)"/i)?.[1] ?? null;
    if (rel === null || rel === "alternate") return href;
    if (!fallback) fallback = href;
  }
  return fallback;
}

function resolveUrl(url: string | null | undefined, base: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed, base ?? undefined).href;
  } catch {
    return trimmed;
  }
}

function findImage(xml: string, baseUrl: string | null): string | null {
  // 1) media:thumbnail (auch innerhalb <media:group>, z.B. YouTube)
  const thumb = xml.match(/<media:thumbnail\s[^>]*\burl\s*=\s*"([^"]*)"/i);
  if (thumb) return resolveUrl(thumb[1], baseUrl);
  // 2) media:content (Bild bevorzugt)
  const mediaImage = xml.match(
    /<media:content\s[^>]*\bmedium\s*=\s*"image"[^>]*\burl\s*=\s*"([^"]*)"/i,
  );
  if (mediaImage) return resolveUrl(mediaImage[1], baseUrl);
  const mediaImage2 = xml.match(
    /<media:content\s[^>]*\burl\s*=\s*"([^"]*)"[^>]*\bmedium\s*=\s*"image"/i,
  );
  if (mediaImage2) return resolveUrl(mediaImage2[1], baseUrl);
  const media = xml.match(/<media:content\s[^>]*\burl\s*=\s*"([^"]*\.(?:jpe?g|png|gif|webp))"/i);
  if (media) return resolveUrl(media[1], baseUrl);
  // 3) enclosure (RSS) — type="image/..." mit url in beliebiger Reihenfolge
  const encl = xml.match(/<enclosure\s[^>]*\burl\s*=\s*"([^"]*)"[^>]*\btype\s*=\s*"image\/[^"]*"/i);
  if (encl) return resolveUrl(encl[1], baseUrl);
  const encl2 = xml.match(/<enclosure\s[^>]*\btype\s*=\s*"image\/[^"]*"[^>]*\burl\s*=\s*"([^"]*)"/i);
  if (encl2) return resolveUrl(encl2[1], baseUrl);
  // 4) image-Tag mit url-Sub-Tag (manche RSS-Feeds nutzen das auf Item-Ebene)
  const imageBlock = tag(xml, "image");
  if (imageBlock) {
    const imageUrl = tag(imageBlock, "url");
    if (imageUrl) return resolveUrl(clean(imageUrl), baseUrl);
  }
  // 5) itunes:image href="" (Podcast-Feeds)
  const itunes = xml.match(/<itunes:image\s[^>]*\bhref\s*=\s*"([^"]*)"/i);
  if (itunes) return resolveUrl(itunes[1], baseUrl);
  // 6) generische Custom-Namespace-Tags: <prefix:image>URL</prefix:image>
  //    (z.B. <dotabuff:image>/blog/.../image</dotabuff:image>)
  const customImg = xml.match(/<(\w+):image(?:\s[^>]*)?>([\s\S]*?)<\/\1:image>/i);
  if (customImg) {
    const candidate = stripCdata(customImg[2]!).trim();
    if (candidate && !candidate.includes("<")) {
      return resolveUrl(candidate, baseUrl);
    }
  }
  const customThumb = xml.match(/<(\w+):thumbnail(?:\s[^>]*)?>([\s\S]*?)<\/\1:thumbnail>/i);
  if (customThumb) {
    const candidate = stripCdata(customThumb[2]!).trim();
    if (candidate && !candidate.includes("<")) {
      return resolveUrl(candidate, baseUrl);
    }
  }
  // 7) erstes <img src=""> im Description/Content (auch Single-Quotes)
  const description =
    tag(xml, "content:encoded") ??
    tag(xml, "description") ??
    tag(xml, "summary") ??
    tag(xml, "content") ??
    "";
  const img =
    description.match(/<img[^>]+src\s*=\s*"([^"]+)"/i) ??
    description.match(/<img[^>]+src\s*=\s*'([^']+)'/i);
  if (img) return resolveUrl(decodeEntities(img[1]!), baseUrl);
  // 8) og:image im Description-Markup (selten, aber kommt vor)
  const og = description.match(/property\s*=\s*"og:image"[^>]*content\s*=\s*"([^"]+)"/i);
  if (og) return resolveUrl(decodeEntities(og[1]!), baseUrl);
  return null;
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const cleaned = stripCdata(raw).trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function parseItemBlock(block: string, isAtom: boolean, baseUrl: string | null): FeedItem {
  const title = clean(tag(block, "title")) ?? "(Kein Titel)";
  const rawLink = isAtom ? atomLink(block) : clean(tag(block, "link"));
  const link = resolveUrl(rawLink, baseUrl);
  const descRaw =
    tag(block, "content:encoded") ??
    tag(block, "description") ??
    tag(block, "summary") ??
    tag(block, "content");
  const description = clean(descRaw);
  const pubDate = parseDate(
    tag(block, "pubDate") ?? tag(block, "published") ?? tag(block, "updated") ?? tag(block, "dc:date"),
  );
  const guidRaw = tag(block, "guid") ?? tag(block, "id") ?? link ?? title;
  const guid = (guidRaw ? stripCdata(guidRaw).trim() : "") || title;
  const imageUrl = findImage(block, baseUrl);
  const author = clean(
    tag(block, "author") ?? tag(block, "dc:creator") ?? tag(block, "name"),
  );
  return { guid, title, link, description, pubDate, imageUrl, author };
}

export function parseFeed(xml: string, sourceUrl?: string): ParsedFeed {
  // Atom vs RSS erkennen.
  const isAtom = /<feed[\s>]/i.test(xml) && /xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/i.test(xml);
  const channelBlock = tag(xml, "channel") ?? xml;

  const title = clean(tag(channelBlock, "title"));
  const rawLink = isAtom ? atomLink(channelBlock) : clean(tag(channelBlock, "link"));
  // Base-URL für relative Links/Bilder: Feed-Link bevorzugt, sonst Origin der Source-URL.
  const link = resolveUrl(rawLink, sourceUrl ?? null);
  const baseUrl = link ?? sourceUrl ?? null;

  const description = clean(tag(channelBlock, "description") ?? tag(channelBlock, "subtitle"));
  const imageUrl =
    resolveUrl(attr(channelBlock, "image", "href"), baseUrl) ??
    resolveUrl(clean(tag(tag(channelBlock, "image") ?? "", "url")), baseUrl) ??
    null;

  const itemTag = isAtom ? "entry" : "item";
  const blocks = allTags(xml, itemTag);
  const items = blocks.map((b) => parseItemBlock(b, isAtom, baseUrl));

  return { title, link, description, imageUrl, items };
}

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  const blocked = await checkFetchUrl(url);
  if (blocked) throw new Error(blocked);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "DiscordBot-RSS/1.0",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    },
    cache: "no-store" as RequestCache,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Feed antwortete mit HTTP ${res.status}`);
  }
  const xml = await res.text();
  if (!xml.trim()) throw new Error("Feed lieferte leere Antwort.");
  return parseFeed(xml, url);
}
