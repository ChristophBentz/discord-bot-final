import { getConfig, prisma } from "@repo/db";
import { StatCard } from "@/components/StatCard";
import { ModuleCard, type IconColor } from "@/components/ModuleCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { OpenTicketsCard, type OpenTicketItem } from "@/components/OpenTicketsCard";

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
};

function formatVoiceTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default async function DashboardOverview() {
  const config = await getConfig();
  const [stats, recentUsers, openTickets] = await Promise.all([
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
  ]);

  // Avatare aus der Member-Tabelle dazujoinen (für Activity + offene Tickets)
  const allUserIds = [
    ...recentUsers.map((u) => u.userId),
    ...openTickets.map((t) => t.userId),
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

  const totalMessages = stats._sum.messageCount ?? 0;
  const totalVoice = stats._sum.voiceSeconds ?? 0;
  const totalXp = stats._sum.xp ?? 0;
  const memberCount = config.guildMemberCount;
  const date = new Date().toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const modules: Array<{
    title: string;
    description: string;
    href?: string;
    iconColor: IconColor;
    icon: React.ReactNode;
    enabled: boolean;
    soon?: boolean;
  }> = [
    {
      title: "Allgemein",
      description: "Bot-Status und globale Einstellungen.",
      href: "/dashboard/general",
      iconColor: "slate",
      icon: icons.settings,
      enabled: Boolean(config.botStatusText),
    },
    {
      title: "Audit Logs",
      description: "Server-Events an einen Channel weiterleiten.",
      href: "/dashboard/logging",
      iconColor: "blue",
      icon: icons.doc,
      enabled: Boolean(config.logChannelId),
    },
    {
      title: "Moderation",
      description: "Kick, Ban, Timeout und Warnungen.",
      href: "/dashboard/moderation",
      iconColor: "red",
      icon: icons.shield,
      enabled: true,
    },
    {
      title: "AutoMod",
      description: "Wortfilter, Invite-Block, Anti-Spam.",
      href: "/dashboard/automod",
      iconColor: "red",
      icon: icons.warning,
      enabled: config.autoModEnabled,
    },
    {
      title: "Welcome",
      description: "Begrüßung neuer Mitglieder + Auto-Rollen.",
      href: "/dashboard/welcome",
      iconColor: "green",
      icon: icons.envelope,
      enabled: config.welcomeEnabled || config.leaveEnabled || config.autoRolesEnabled,
    },
    {
      title: "Leveling",
      description: "XP, Ränge & Voice-Tracking.",
      href: "/dashboard/leveling",
      iconColor: "amber",
      icon: icons.trophy,
      enabled: config.levelingEnabled,
    },
    {
      title: "Achievements",
      description: "Custom-Erfolge mit Bild und Auto-Vergabe.",
      href: "/dashboard/achievements",
      iconColor: "amber",
      icon: icons.medal,
      enabled: true,
    },
    {
      title: "Tickets",
      description: "Support-Threads via Bot-Panel.",
      href: "/dashboard/tickets",
      iconColor: "pink",
      icon: icons.ticket,
      enabled: config.ticketsEnabled,
    },
    {
      title: "Temp-Channels",
      description: "Join-to-Create Voice-Channels.",
      href: "/dashboard/temp-channels",
      iconColor: "teal",
      icon: icons.plus,
      enabled: config.tempChannelEnabled,
    },
    {
      title: "Musik",
      description: "YouTube, Spotify, SoundCloud im Voice.",
      href: "/dashboard/music",
      iconColor: "orange",
      icon: icons.music,
      enabled: config.musicEnabled,
    },
    {
      title: "Free Games",
      description: "Auto-Posts: Epic, Steam, GOG, Konsolen.",
      href: "/dashboard/free-games",
      iconColor: "violet",
      icon: icons.gift,
      enabled: config.freeGamesEnabled,
    },
    {
      title: "Nachrichten",
      description: "Text, Embeds, Umfragen, Dateien senden.",
      href: "/dashboard/compose",
      iconColor: "blue",
      icon: icons.send,
      enabled: true,
    },
    {
      title: "Reaction Rolls",
      description: "Self-Service-Rollen über Reaktionen.",
      iconColor: "violet",
      icon: icons.sparkles,
      enabled: false,
      soon: true,
    },
    {
      title: "Custom Commands",
      description: "Eigene Slash-Befehle definieren.",
      iconColor: "teal",
      icon: icons.terminal,
      enabled: false,
      soon: true,
    },
  ];

  const activeCount = modules.filter((m) => m.enabled && !m.soon).length;
  const availableCount = modules.filter((m) => !m.soon).length;

  // Aktivitäts-Feed aus den letzten aktiven Usern
  const activity = recentUsers.map((u, i) => {
    const member = memberById.get(u.userId);
    const displayName = member?.displayName ?? u.displayName ?? `User ${u.userId.slice(-4)}`;
    return {
      id: u.userId,
      user: displayName,
      initial: displayName[0] ?? "U",
      avatarUrl: member?.avatarUrl ?? null,
      text: `Level ${u.level} · ${u.messageCount.toLocaleString("de-DE")} Nachrichten · ${formatVoiceTime(u.voiceSeconds)} Voice`,
      timestamp: u.lastMessage,
      tone: (["violet", "blue", "green", "amber", "pink"] as const)[i % 5],
    };
  });

  return (
    <div className="mx-auto max-w-5xl grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        {/* Page Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-brand">Server</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Übersicht</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Hier ist was sich auf <span className="font-semibold text-ink">{config.guildName ?? "deinem Server"}</span> tut · {date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary">
              <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" /></svg>
              Aktualisieren
            </button>
          </div>
        </header>

        {/* Stat Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Mitglieder" value={memberCount.toLocaleString("de-DE")} iconColor="violet">
            {icons.users}
          </StatCard>
          <StatCard
            label="Nachrichten"
            value={totalMessages.toLocaleString("de-DE")}
            hint={`über ${stats._count} aktive User`}
            iconColor="blue"
          >
            {icons.chat}
          </StatCard>
          <StatCard
            label="Voice-Zeit"
            value={formatVoiceTime(totalVoice)}
            hint="kumuliert"
            iconColor="pink"
          >
            {icons.voice}
          </StatCard>
          <StatCard
            label="XP vergeben"
            value={totalXp.toLocaleString("de-DE")}
            iconColor="amber"
          >
            {icons.bolt}
          </StatCard>
        </section>

        {/* Module-Grid */}
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Module</h2>
              <p className="mt-1 text-sm text-ink-muted">Aktiviere und konfiguriere, was dein Server braucht.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {activeCount} aktiv
              </span>
              <span className="badge">
                {availableCount - activeCount} inaktiv
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((m) => (
              <ModuleCard
                key={m.title}
                title={m.title}
                description={m.description}
                href={m.href}
                iconColor={m.iconColor}
                icon={m.icon}
                enabled={m.enabled}
                soon={m.soon}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Right rail */}
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] flex flex-col gap-4 overflow-hidden">
        <OpenTicketsCard tickets={openTicketItems} />
        <div className="min-h-0 flex-1">
          <ActivityFeed items={activity} />
        </div>
      </aside>
    </div>
  );
}
