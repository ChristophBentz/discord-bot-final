// Minimalistischer RSS/Atom-Parser ohne externe Dependencies.
// Unterstützt RSS 2.0 (<item>), RDF (<item>), und Atom (<entry>).

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

function findImage(xml: string): string | null {
  // 1) media:content url=""
  const media = xml.match(/<media:content\s[^>]*\burl\s*=\s*"([^"]*)"/i);
  if (media) return media[1]!;
  // 2) media:thumbnail
  const thumb = xml.match(/<media:thumbnail\s[^>]*\burl\s*=\s*"([^"]*)"/i);
  if (thumb) return thumb[1]!;
  // 3) enclosure (RSS)
  const encl = xml.match(/<enclosure\s[^>]*\bturl?\s*=\s*"([^"]*)"[^>]*\btype\s*=\s*"image\/[^"]*"/i);
  if (encl) return encl[1]!;
  const encl2 = xml.match(/<enclosure\s[^>]*\btype\s*=\s*"image\/[^"]*"[^>]*\burl\s*=\s*"([^"]*)"/i);
  if (encl2) return encl2[1]!;
  // 4) erstes <img src=""> im Description/Content
  const description = tag(xml, "content:encoded") ?? tag(xml, "description") ?? tag(xml, "summary") ?? tag(xml, "content") ?? "";
  const img = description.match(/<img[^>]+src\s*=\s*"([^"]+)"/i);
  if (img) return img[1]!;
  return null;
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const cleaned = stripCdata(raw).trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function parseItemBlock(block: string, isAtom: boolean): FeedItem {
  const title = clean(tag(block, "title")) ?? "(Kein Titel)";
  const link = isAtom
    ? atomLink(block)
    : clean(tag(block, "link"));
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
  const imageUrl = findImage(block);
  const author = clean(
    tag(block, "author") ?? tag(block, "dc:creator") ?? tag(block, "name"),
  );
  return { guid, title, link: link ?? null, description, pubDate, imageUrl, author };
}

export function parseFeed(xml: string): ParsedFeed {
  // Atom vs RSS erkennen.
  const isAtom = /<feed[\s>]/i.test(xml) && /xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/i.test(xml);
  const channelBlock = tag(xml, "channel") ?? xml;

  const title = clean(tag(channelBlock, "title"));
  const link = isAtom ? atomLink(channelBlock) : clean(tag(channelBlock, "link"));
  const description = clean(tag(channelBlock, "description") ?? tag(channelBlock, "subtitle"));
  const imageUrl =
    attr(channelBlock, "image", "href") ??
    clean(tag(tag(channelBlock, "image") ?? "", "url")) ??
    null;

  const itemTag = isAtom ? "entry" : "item";
  const blocks = allTags(xml, itemTag);
  const items = blocks.map((b) => parseItemBlock(b, isAtom));

  return { title, link, description, imageUrl, items };
}

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
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
  return parseFeed(xml);
}
