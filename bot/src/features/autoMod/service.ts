import { prisma } from "@repo/db";
import { env } from "../../lib/env.js";

// Wortliste mit kurzer Cache-Zeit, damit Dashboard-Änderungen schnell greifen.
let cached: { words: string[]; loadedAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

async function loadWords(): Promise<string[]> {
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.words;
  const rows = await prisma.blacklistedWord.findMany({ select: { word: true } });
  cached = { words: rows.map((r) => r.word.toLowerCase()), loadedAt: Date.now() };
  return cached.words;
}

export function invalidateBlacklistCache(): void {
  cached = null;
}

// Whitelist-Cache (jetzt nach Guild-ID).
let cachedWhitelist: { guildIds: Set<string>; loadedAt: number } | null = null;
const INVITE_RE_GLOBAL = /(?:discord(?:app)?\.com\/invite|discord\.gg)\/([a-zA-Z0-9-]+)/gi;

async function loadWhitelist(): Promise<Set<string>> {
  if (cachedWhitelist && Date.now() - cachedWhitelist.loadedAt < CACHE_TTL_MS) {
    return cachedWhitelist.guildIds;
  }
  const rows = await prisma.whitelistedInvite.findMany({ select: { guildId: true } });
  cachedWhitelist = {
    guildIds: new Set(rows.map((r) => r.guildId)),
    loadedAt: Date.now(),
  };
  return cachedWhitelist.guildIds;
}

export function invalidateInviteWhitelistCache(): void {
  cachedWhitelist = null;
}

// Code → Guild-ID Cache, damit wir nicht jedes Mal Discord-API hämmern.
const codeToGuild = new Map<string, { guildId: string | null; expires: number }>();
const RESOLVE_TTL_MS = 5 * 60_000;

async function resolveCodeToGuildId(code: string): Promise<string | null> {
  const lower = code.toLowerCase();
  const cached = codeToGuild.get(lower);
  if (cached && cached.expires > Date.now()) return cached.guildId;
  try {
    const res = await fetch(
      `https://discord.com/api/v10/invites/${encodeURIComponent(code)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      codeToGuild.set(lower, { guildId: null, expires: Date.now() + RESOLVE_TTL_MS });
      return null;
    }
    const data = (await res.json()) as { guild?: { id?: string } };
    const id = data.guild?.id ?? null;
    codeToGuild.set(lower, { guildId: id, expires: Date.now() + RESOLVE_TTL_MS });
    return id;
  } catch {
    return null;
  }
}

// Liefert den ersten NICHT-whitelisteten Invite-Code im Text. null = alle Invites erlaubt oder gar keine drin.
export async function findForbiddenInvite(content: string): Promise<string | null> {
  const whitelist = await loadWhitelist();
  INVITE_RE_GLOBAL.lastIndex = 0;
  const codes: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = INVITE_RE_GLOBAL.exec(content)) !== null) {
    if (match[1]) codes.push(match[1]);
  }
  if (codes.length === 0) return null;

  for (const code of codes) {
    const guildId = await resolveCodeToGuildId(code);
    // Nicht auflösbar = Invite ist eh tot/ungültig — als verboten behandeln (löschen).
    if (!guildId) return code;
    // Eigener Server ist immer erlaubt.
    if (guildId === env.DISCORD_GUILD_ID) continue;
    if (!whitelist.has(guildId)) return code;
  }
  return null;
}

// Channel-Exclusions Cache.
let cachedExclusions: { ids: Set<string>; loadedAt: number } | null = null;

async function loadExclusions(): Promise<Set<string>> {
  if (cachedExclusions && Date.now() - cachedExclusions.loadedAt < CACHE_TTL_MS) {
    return cachedExclusions.ids;
  }
  const rows = await prisma.autoModExcludedChannel.findMany({ select: { channelId: true } });
  cachedExclusions = {
    ids: new Set(rows.map((r) => r.channelId)),
    loadedAt: Date.now(),
  };
  return cachedExclusions.ids;
}

export function invalidateExclusionCache(): void {
  cachedExclusions = null;
}

export async function isChannelExcluded(channelId: string): Promise<boolean> {
  const ids = await loadExclusions();
  return ids.has(channelId);
}

// Bypass-Rollen Cache.
let cachedBypassRoles: { ids: Set<string>; loadedAt: number } | null = null;

async function loadBypassRoles(): Promise<Set<string>> {
  if (cachedBypassRoles && Date.now() - cachedBypassRoles.loadedAt < CACHE_TTL_MS) {
    return cachedBypassRoles.ids;
  }
  const rows = await prisma.autoModBypassRole.findMany({ select: { roleId: true } });
  cachedBypassRoles = {
    ids: new Set(rows.map((r) => r.roleId)),
    loadedAt: Date.now(),
  };
  return cachedBypassRoles.ids;
}

export function invalidateBypassRoleCache(): void {
  cachedBypassRoles = null;
}

export async function hasAutoModBypassRole(roleIds: Iterable<string>): Promise<boolean> {
  const allowed = await loadBypassRoles();
  if (allowed.size === 0) return false;
  for (const id of roleIds) {
    if (allowed.has(id)) return true;
  }
  return false;
}

// ─── Anti-Spam Tracker (in-memory) ─────────────────────────────────────────
interface MessageStamp {
  ts: number;
  channelId: string;
  messageId: string;
}
const spamWindow = new Map<string, MessageStamp[]>(); // userId -> recent stamps

// Track a message and check if user has exceeded the threshold within the window.
// Returns the stamps that contributed to the spam if triggered, null otherwise.
export function trackForSpam(
  userId: string,
  stamp: MessageStamp,
  maxMessages: number,
  windowSeconds: number,
): MessageStamp[] | null {
  const cutoff = stamp.ts - windowSeconds * 1000;
  const existing = (spamWindow.get(userId) ?? []).filter((s) => s.ts >= cutoff);
  existing.push(stamp);
  spamWindow.set(userId, existing);

  if (existing.length >= maxMessages) {
    // Triggered — return all stamps in window and clear them
    spamWindow.delete(userId);
    return existing;
  }
  return null;
}

// Findet das erste gefundene blacklistede Wort, sonst null.
// Match: Substring, case-insensitive, mit normalisierter Whitespace + Sonderzeichen-Stripping.
export async function findBadWord(content: string): Promise<string | null> {
  const words = await loadWords();
  if (words.length === 0) return null;

  // Normalisieren: lowercase + Mehrfach-Whitespace zu Space + diakritische Zeichen entfernen.
  const normalized = content
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

  for (const w of words) {
    if (normalized.includes(w)) return w;
  }
  return null;
}
