import { getConfig, prisma } from "@repo/db";
import { StatCard } from "@/components/StatCard";
import { ModuleCard } from "@/components/ModuleCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { OpenTicketsCard, type OpenTicketItem } from "@/components/OpenTicketsCard";
import { OpenAppealsCard, type OpenAppealItem } from "@/components/OpenAppealsCard";

// SVG-Icons als kleine Helper.
const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const icons = {
  users: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><circle cx="9" cy="8" r="3" /><circle cx="16" cy="9" r="2.5" /><path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" /><path d="M14 14c3 0 7 1.5 7 5" /></svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><path d="M21 12a8 8 0 0 1-12.4 6.7L3 20l1.3-4.6A8 8 0 1 1 21 12Z" /></svg>
  ),
  voice: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" /></svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" /></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" /></svg>
  ),
  envelope: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="m12 4 1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5L12 4Z" /></svg>
  ),
  terminal: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="m4 7 4 4-4 4M12 15h8" /></svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
  ),
  coin: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M9 9h4.5a2 2 0 1 1 0 4H9a2 2 0 1 0 0 4h5" /></svg>
  ),
  music: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
  ),
  ticket: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M13 6v12" /></svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M12 3 2 21h20L12 3Z" /><path d="M12 10v5M12 18h.01" /></svg>
  ),
  medal: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M7 3h10l-3 6H10L7 3Z" /><circle cx="12" cy="15" r="5" /><path d="m10 14 2 2 4-4" /></svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
  ),
  rss: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
  ),
  stats: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-6" /></svg>
  ),
  wand: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" /></svg>
  ),
  smile: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></svg>
  ),
};

/** Zahlen ab 1000 kompakt: 1.500 → "1,5k", 2.000.000 → "2M". */
function formatCompact(n: number): string {
  const fmt = (value: number, suffix: string) => {
    const rounded = (Math.round(value * 10) / 10).toFixed(1).replace(".", ",");
    return `${rounded.endsWith(",0") ? rounded.slice(0, -2) : rounded}${suffix}`;
  };
  if (n >= 1_000_000) return fmt(n / 1_000_000, "M");
  if (n >= 1_000) return fmt(n / 1_000, "k");
  return n.toLocaleString("de-DE");
}

function formatVoiceTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  // Ab 1000 Stunden kompakt ohne Minuten ("1,2k h"), sonst wird der Wert zu lang.
  if (h >= 1000) return `${formatCompact(h)} h`;
  return `${h}h ${m}m`;
}

export default async function DashboardOverview() {
  const config = await getConfig();
  const [
    stats,
    recentUsers,
    openTickets,
    openAppeals,
    selfRoleCount,
    commandCount,
    rssCount,
    achievementCount,
  ] = await Promise.all([
    prisma.levelUser.aggregate({
      _sum: { messageCount: true, voiceSeconds: true, xp: true },
      _count: true,
    }),
    prisma.levelUser.findMany({
      orderBy: { lastMessage: "desc" },
      take: 8,
    }),
    prisma.ticket.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    prisma.banAppeal.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.selfRolePanel.count(),
    prisma.customCommand.count(),
    prisma.rssFeed.count(),
    prisma.achievement.count(),
  ]);

  // Avatare aus der Member-Tabelle dazujoinen (für Activity + offene Tickets + Anträge)
  const allUserIds = [
    ...recentUsers.map((u) => u.userId),
    ...openTickets.map((t) => t.userId),
    ...openAppeals.map((a) => a.userId),
  ];
  const members = await prisma.member.findMany({
    where: { userId: { in: allUserIds } },
    select: { userId: true, avatarUrl: true, displayName: true },
  });
  const memberById = new Map(members.map((m) => [m.userId, m]));

  const openTicketItems: OpenTicketItem[] = openTickets.map((t) => {
    const m = memberById.get(t.userId);
    return {
      id: t.id,
      userId: t.userId,
      userName: m?.displayName ?? t.username ?? `User ${t.userId.slice(-4)}`,
      userAvatarUrl: m?.avatarUrl ?? null,
      topic: t.topic,
      messageCount: t._count.messages,
      createdAt: t.createdAt,
      lastActivity: t.messages[0]?.createdAt ?? t.createdAt,
    };
  });

  const openAppealItems: OpenAppealItem[] = openAppeals.map((a) => {
    const m = memberById.get(a.userId);
    return {
      id: a.id,
      userId: a.userId,
      userName: m?.displayName ?? a.username ?? `User ${a.userId.slice(-4)}`,
      userAvatarUrl: m?.avatarUrl ?? null,
      banReason: a.banReason,
      createdAt: a.createdAt,
    };
  });

  const totalMessages = stats._sum.messageCount ?? 0;
  const totalVoice = stats._sum.voiceSeconds ?? 0;
  const totalXp = stats._sum.xp ?? 0;
  const memberCount = config.guildMemberCount;

  const modules: Array<{
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
    enabled: boolean;
  }> = [
    {
      title: "Moderation",
      description: "Kick, Ban, Timeout und Warnungen.",
      href: "/dashboard/moderation",
      icon: icons.shield,
      enabled: true,
    },
    {
      title: "AutoMod",
      description: "Wortfilter, Invite-Block, Anti-Spam.",
      href: "/dashboard/automod",
      icon: icons.warning,
      enabled: config.autoModEnabled,
    },
    {
      title: "Audit Logs",
      description: "Server-Events an einen Channel weiterleiten.",
      href: "/dashboard/logging",
      icon: icons.doc,
      enabled: Boolean(config.logChannelId),
    },
    {
      title: "Welcome",
      description: "Begrüßung neuer Mitglieder + Auto-Rollen.",
      href: "/dashboard/welcome",
      icon: icons.envelope,
      enabled: config.welcomeEnabled || config.leaveEnabled || config.autoRolesEnabled,
    },
    {
      title: "Leveling",
      description: "XP, Ränge & Voice-Tracking.",
      href: "/dashboard/leveling",
      icon: icons.trophy,
      enabled: config.levelingEnabled,
    },
    {
      title: "Achievements",
      description: "Eigene Erfolge mit Bild und Auto-Vergabe.",
      href: "/dashboard/achievements",
      icon: icons.medal,
      enabled: achievementCount > 0,
    },
    {
      title: "Auto-Rollen",
      description: "Self-Assign-Panels mit Reactions, Buttons, Dropdown.",
      href: "/dashboard/self-roles",
      icon: icons.sparkles,
      enabled: selfRoleCount > 0,
    },
    {
      title: "Custom Commands",
      description: "Eigene Slash-Befehle definieren.",
      href: "/dashboard/commands",
      icon: icons.terminal,
      enabled: commandCount > 0,
    },
    {
      title: "Tickets",
      description: "Support-Threads via Bot-Panel.",
      href: "/dashboard/tickets",
      icon: icons.ticket,
      enabled: config.ticketsEnabled,
    },
    {
      title: "Temp-Channels",
      description: "Join-to-Create Voice-Channels.",
      href: "/dashboard/temp-channels",
      icon: icons.plus,
      enabled: config.tempChannelEnabled,
    },
    {
      title: "Musik",
      description: "YouTube, Spotify, SoundCloud im Voice.",
      href: "/dashboard/music",
      icon: icons.music,
      enabled: config.musicEnabled,
    },
    {
      title: "Free Games",
      description: "Auto-Posts: Epic, Steam, GOG, Konsolen.",
      href: "/dashboard/free-games",
      icon: icons.gift,
      enabled: config.freeGamesEnabled,
    },
    {
      title: "RSS-Feeds",
      description: "RSS/Atom-Feeds in Channels posten.",
      href: "/dashboard/rss",
      icon: icons.rss,
      enabled: rssCount > 0,
    },
    {
      title: "Server-Stats",
      description: "Live-Counter in Voice-Channel-Namen.",
      href: "/dashboard/server-stats",
      icon: icons.stats,
      enabled: config.serverStatsEnabled,
    },
    {
      title: "Nachrichten",
      description: "Text, Embeds, Umfragen, Dateien senden.",
      href: "/dashboard/compose",
      icon: icons.send,
      enabled: true,
    },
    {
      title: "AI",
      description: "KI-Antworten im Chat.",
      href: "/dashboard/ai",
      icon: icons.wand,
      enabled: config.aiEnabled,
    },
  ];

  const activeCount = modules.filter((m) => m.enabled).length;

  // Aktivitäts-Feed aus den letzten aktiven Usern
  const activity = recentUsers.map((u) => {
    const member = memberById.get(u.userId);
    const displayName = member?.displayName ?? u.displayName ?? `User ${u.userId.slice(-4)}`;
    return {
      id: u.userId,
      user: displayName,
      initial: displayName[0] ?? "U",
      avatarUrl: member?.avatarUrl ?? null,
      text: `Level ${u.level} · ${u.messageCount.toLocaleString("de-DE")} Nachrichten · ${formatVoiceTime(u.voiceSeconds)} Voice`,
      timestamp: u.lastMessage,
    };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        {/* Page Header */}
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Übersicht</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {config.guildName ?? "Server"} · {memberCount.toLocaleString("de-DE")} Mitglieder
          </p>
        </header>

        {/* Stat Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Mitglieder" value={formatCompact(memberCount)}>
            {icons.users}
          </StatCard>
          <StatCard
            label="Nachrichten"
            value={formatCompact(totalMessages)}
            hint={`über ${stats._count} aktive User`}
          >
            {icons.chat}
          </StatCard>
          <StatCard label="Voice-Zeit" value={formatVoiceTime(totalVoice)} hint="kumuliert">
            {icons.voice}
          </StatCard>
          <StatCard label="XP vergeben" value={formatCompact(totalXp)}>
            {icons.bolt}
          </StatCard>
        </section>

        {/* Module-Grid */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Module</h2>
            <span className="text-xs text-ink-muted">
              {activeCount} von {modules.length} aktiv
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((m) => (
              <ModuleCard
                key={m.title}
                title={m.title}
                description={m.description}
                href={m.href}
                icon={m.icon}
                enabled={m.enabled}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Right rail */}
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] flex flex-col gap-4 overflow-hidden">
        <OpenAppealsCard appeals={openAppealItems} />
        <OpenTicketsCard tickets={openTicketItems} />
        <div className="min-h-0 flex-1">
          <ActivityFeed items={activity} />
        </div>
      </aside>
    </div>
  );
}
