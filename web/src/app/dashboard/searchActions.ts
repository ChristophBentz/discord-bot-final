"use server";

import { prisma } from "@repo/db";

export interface SearchResult {
  type: "member" | "channel" | "page" | "command" | "achievement";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  avatarUrl?: string | null;
  hint?: string;
}

interface PageEntry {
  title: string;
  subtitle: string;
  href: string;
  /** Synonyme/Aliasse — werden mit-durchsucht (lowercase). */
  keywords?: string[];
}

const PAGES: PageEntry[] = [
  {
    title: "Übersicht",
    subtitle: "Dashboard-Startseite",
    href: "/dashboard",
    keywords: ["home", "start", "dashboard"],
  },
  {
    title: "Mitglieder",
    subtitle: "Server-Mitgliederliste",
    href: "/dashboard/members",
    keywords: ["members", "user", "leute", "profil"],
  },
  {
    title: "Analytics",
    subtitle: "Statistiken & Charts",
    href: "/dashboard/analytics",
    keywords: ["stats", "statistiken", "diagramm", "graph", "charts"],
  },
  {
    title: "Moderation",
    subtitle: "Warns, Mutes, Bans",
    href: "/dashboard/moderation",
    keywords: ["mod", "warn", "verwarnung", "ban", "mute", "timeout", "kick"],
  },
  {
    title: "AutoMod",
    subtitle: "Automatische Moderation",
    href: "/dashboard/automod",
    keywords: ["spam", "filter", "antispam", "mass-mention", "invite"],
  },
  {
    title: "Audit Logs",
    subtitle: "Event-Logs konfigurieren",
    href: "/dashboard/logging",
    keywords: ["logging", "logs", "audit", "events", "protokoll"],
  },
  {
    title: "Welcome",
    subtitle: "Begrüßungsnachrichten",
    href: "/dashboard/welcome",
    keywords: ["willkommen", "join", "leave", "begrüßung", "verabschiedung"],
  },
  {
    title: "Leveling",
    subtitle: "XP-System & Ränge",
    href: "/dashboard/leveling",
    keywords: ["xp", "level", "rang", "rank", "punkte", "erfahrung"],
  },
  {
    title: "Achievements",
    subtitle: "Erfolge & Auszeichnungen",
    href: "/dashboard/achievements",
    keywords: ["erfolge", "auszeichnung", "badge", "trophy", "trophäe"],
  },
  {
    title: "Server-Stats",
    subtitle: "Live-Counter-Channels",
    href: "/dashboard/server-stats",
    keywords: ["counter", "zähler", "online", "mitgliederzahl"],
  },
  {
    title: "Auto-Rollen",
    subtitle: "Self-Assign-Panels (Reactions/Buttons/Dropdown)",
    href: "/dashboard/self-roles",
    keywords: ["rollen", "roles", "selfrole", "selbst", "reaction-role", "rolle"],
  },
  {
    title: "Custom Commands",
    subtitle: "Eigene Slash-Commands definieren",
    href: "/dashboard/commands",
    keywords: ["commands", "befehle", "slash", "command", "cmds"],
  },
  {
    title: "Emojis",
    subtitle: "Custom-Emojis hochladen und verwalten",
    href: "/dashboard/emojis",
    keywords: ["emoji", "sticker", "emote", "icon"],
  },
  {
    title: "Temp-Channels",
    subtitle: "Join-to-Create Voice",
    href: "/dashboard/temp-channels",
    keywords: ["voice", "temp", "channel", "j2c", "join-to-create"],
  },
  {
    title: "Tickets",
    subtitle: "Ticket-System",
    href: "/dashboard/tickets",
    keywords: ["support", "ticket", "anfragen", "hilfe"],
  },
  {
    title: "Musik",
    subtitle: "Music-Bot-Steuerung",
    href: "/dashboard/music",
    keywords: ["music", "song", "play", "player", "audio"],
  },
  {
    title: "Free Games",
    subtitle: "Gratis-Spiele posten",
    href: "/dashboard/free-games",
    keywords: ["games", "spiele", "gratis", "kostenlos", "epic", "steam", "gog"],
  },
  {
    title: "RSS-Feeds",
    subtitle: "Feed-Posting",
    href: "/dashboard/rss",
    keywords: ["rss", "feed", "atom", "news", "blog", "youtube"],
  },
  {
    title: "Nachrichten",
    subtitle: "Nachricht senden",
    href: "/dashboard/compose",
    keywords: ["compose", "senden", "embed", "umfrage", "poll", "post"],
  },
  {
    title: "Allgemein",
    subtitle: "Bot-Profil, Avatar, Banner, Nickname",
    href: "/dashboard/general",
    keywords: ["bot", "avatar", "banner", "nickname", "profil", "name", "beschreibung"],
  },
  {
    title: "Bot-Health",
    subtitle: "Status, Memory, Latenz, Scheduler, Errors",
    href: "/dashboard/system",
    keywords: ["health", "status", "uptime", "memory", "errors", "logs", "scheduler", "debug", "system"],
  },
  {
    title: "AI",
    subtitle: "Bild-Generierung via /image (MiniMax)",
    href: "/dashboard/ai",
    keywords: ["ai", "ki", "image", "bild", "generate", "minimax", "openai", "dalle", "stable diffusion"],
  },
];

function matchScore(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 1000;
  if (h.startsWith(n)) return 500;
  if (h.includes(n)) return 100;
  return 0;
}

function pageScore(p: PageEntry, q: string): number {
  let score = matchScore(p.title, q) + matchScore(p.subtitle, q) * 0.5;
  if (p.keywords) {
    for (const kw of p.keywords) {
      score += matchScore(kw, q) * 0.7;
    }
  }
  return score;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const results: SearchResult[] = [];

  // 1) Pages (inkl. Aliasse)
  const scoredPages = PAGES.map((p) => ({ p, score: pageScore(p, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  for (const { p } of scoredPages) {
    results.push({
      type: "page",
      id: p.href,
      title: p.title,
      subtitle: p.subtitle,
      href: p.href,
    });
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

  // 3) Channels (Text → Analytics-Detail; Voice/Category → Server-Stats-Übersicht)
  const channels = await prisma.guildChannel.findMany({
    where: { name: { contains: q } },
    select: { channelId: true, name: true, type: true },
    orderBy: { position: "asc" },
    take: 8,
  });
  for (const c of channels) {
    const isVoice = c.type === 2 || c.type === 13;
    const isCategory = c.type === 4;
    const prefix = isVoice ? "🔊" : isCategory ? "📁" : "#";
    const href = isVoice || isCategory
      ? "/dashboard/server-stats"
      : `/dashboard/analytics/channel/${c.channelId}`;
    results.push({
      type: "channel",
      id: c.channelId,
      title: `${prefix} ${c.name}`,
      subtitle: isVoice ? "Voice-Channel" : isCategory ? "Kategorie" : "Text-Channel",
      href,
    });
  }

  // 4) Custom-Commands (Slash-Name oder Beschreibung)
  // Normalisiere Query: führendes '/' weg, lowercase — User tippt evtl. "/regeln"
  const cmdQuery = q.replace(/^\//, "").toLowerCase();
  const commands = await prisma.customCommand.findMany({
    where: {
      OR: [
        { name: { contains: cmdQuery } },
        { description: { contains: q } },
      ],
    },
    select: { name: true, description: true, responseType: true },
    orderBy: { name: "asc" },
    take: 6,
  });
  for (const cmd of commands) {
    results.push({
      type: "command",
      id: cmd.name,
      title: `/${cmd.name}`,
      subtitle: cmd.description,
      href: "/dashboard/commands",
      hint: cmd.responseType === "embed" ? "Embed" : undefined,
    });
  }

  // 5) Achievements
  const achievements = await prisma.achievement.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
      ],
    },
    select: { id: true, name: true, description: true, imageUrl: true },
    take: 5,
  });
  for (const a of achievements) {
    results.push({
      type: "achievement",
      id: String(a.id),
      title: a.name,
      subtitle: a.description,
      href: "/dashboard/achievements",
      avatarUrl: a.imageUrl,
    });
  }

  return results;
}
