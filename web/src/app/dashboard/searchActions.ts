"use server";

import { prisma } from "@repo/db";

export interface SearchResult {
  type: "member" | "channel" | "page";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  avatarUrl?: string | null;
  hint?: string;
}

const PAGES: { title: string; subtitle: string; href: string }[] = [
  { title: "Übersicht", subtitle: "Dashboard-Startseite", href: "/dashboard" },
  { title: "Mitglieder", subtitle: "Server-Mitgliederliste", href: "/dashboard/members" },
  { title: "Analytics", subtitle: "Statistiken & Charts", href: "/dashboard/analytics" },
  { title: "Moderation", subtitle: "Warns, Mutes, Bans", href: "/dashboard/moderation" },
  { title: "AutoMod", subtitle: "Automatische Moderation", href: "/dashboard/automod" },
  { title: "Logging", subtitle: "Event-Logs konfigurieren", href: "/dashboard/logging" },
  { title: "Welcome", subtitle: "Begrüßungsnachrichten", href: "/dashboard/welcome" },
  { title: "Leveling", subtitle: "XP-System & Ränge", href: "/dashboard/leveling" },
  { title: "Achievements", subtitle: "Erfolge & Auszeichnungen", href: "/dashboard/achievements" },
  { title: "Server-Stats", subtitle: "Live-Counter-Channels", href: "/dashboard/server-stats" },
  { title: "Auto-Rollen", subtitle: "Self-Assign-Panels (Reactions/Buttons/Dropdown)", href: "/dashboard/self-roles" },
  { title: "Temp-Channels", subtitle: "Join-to-Create Voice", href: "/dashboard/temp-channels" },
  { title: "Tickets", subtitle: "Ticket-System", href: "/dashboard/tickets" },
  { title: "Musik", subtitle: "Music-Bot-Steuerung", href: "/dashboard/music" },
  { title: "Free Games", subtitle: "Gratis-Spiele posten", href: "/dashboard/free-games" },
  { title: "RSS-Feeds", subtitle: "Feed-Posting", href: "/dashboard/rss" },
  { title: "Nachrichten", subtitle: "Nachricht senden", href: "/dashboard/compose" },
  { title: "Allgemein", subtitle: "Bot-Profil & Status", href: "/dashboard/general" },
];

function matchScore(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 1000;
  if (h.startsWith(n)) return 500;
  if (h.includes(n)) return 100;
  return 0;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const results: SearchResult[] = [];

  // 1) Pages
  for (const p of PAGES) {
    const score = matchScore(p.title, q) + matchScore(p.subtitle, q) * 0.5;
    if (score > 0) {
      results.push({
        type: "page",
        id: p.href,
        title: p.title,
        subtitle: p.subtitle,
        href: p.href,
      });
    }
  }

  // 2) Members (DB-Suche, Max 8)
  const members = await prisma.member.findMany({
    where: {
      OR: [
        { displayName: { contains: q } },
        { username: { contains: q } },
        { userId: q },
      ],
    },
    select: {
      userId: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      inServer: true,
    },
    orderBy: [{ inServer: "desc" }, { displayName: "asc" }],
    take: 8,
  });
  for (const m of members) {
    results.push({
      type: "member",
      id: m.userId,
      title: m.displayName,
      subtitle: `@${m.username}`,
      href: `/dashboard/members/${m.userId}`,
      avatarUrl: m.avatarUrl,
      hint: m.inServer ? undefined : "verlassen",
    });
  }

  // 3) Channels
  const channels = await prisma.guildChannel.findMany({
    where: { name: { contains: q } },
    select: { channelId: true, name: true, type: true },
    orderBy: { position: "asc" },
    take: 8,
  });
  for (const c of channels) {
    const prefix = c.type === 2 || c.type === 13 ? "🔊" : c.type === 4 ? "📁" : "#";
    results.push({
      type: "channel",
      id: c.channelId,
      title: `${prefix} ${c.name}`,
      href: `/dashboard/analytics/channel/${c.channelId}`,
    });
  }

  return results;
}
