import { prisma } from "@repo/db";
import {
  ActivityHeatmap,
  type ActivityCell,
} from "../members/[userId]/ActivityHeatmap";
import { DailyChart, type DailyPoint } from "./DailyChart";

function dateKeyForDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function formatVoiceTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k h`;
  if (h > 0) return `${h}h ${totalMinutes % 60}m`;
  return `${totalMinutes}m`;
}

function n(x: number): string {
  return x.toLocaleString("de-DE");
}

export default async function AnalyticsPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = dateKeyForDaysAgo(29); // inkl. heute = 30 Tage

  const [
    memberCount,
    activeUsers7d,
    levelStats,
    openTicketsCount,
    closedTicketsCount,
    avgRating,
    warningsCount,
    autoModWords,
    achievementsCount,
    hourlyAgg,
    dailyAgg,
    channelAgg,
    topUsers,
    channelInfo,
  ] = await Promise.all([
    prisma.member.count({ where: { inServer: true } }),
    prisma.levelUser.count({ where: { lastMessage: { gte: sevenDaysAgo } } }),
    prisma.levelUser.aggregate({
      _sum: { messageCount: true, voiceSeconds: true, xp: true },
      _count: true,
    }),
    prisma.ticket.count({ where: { status: "open" } }),
    prisma.ticket.count({ where: { status: "closed" } }),
    prisma.ticket.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
      where: { rating: { not: null } },
    }),
    prisma.warning.count(),
    prisma.blacklistedWord.count(),
    prisma.achievement.count(),
    prisma.hourlyActivity.groupBy({
      by: ["date", "hour"],
      where: { date: { gte: thirtyDaysAgoStr } },
      _sum: { messages: true, voiceSeconds: true },
    }),
    prisma.hourlyActivity.groupBy({
      by: ["date"],
      where: { date: { gte: thirtyDaysAgoStr } },
      _sum: { messages: true, voiceSeconds: true },
    }),
    prisma.channelActivity.groupBy({
      by: ["channelId"],
      where: { date: { gte: thirtyDaysAgoStr } },
      _sum: { messages: true },
      orderBy: { _sum: { messages: "desc" } },
      take: 10,
    }),
    prisma.levelUser.findMany({
      orderBy: { xp: "desc" },
      take: 5,
    }),
    prisma.guildChannel.findMany({
      select: { channelId: true, name: true },
    }),
  ]);

  const cells: ActivityCell[] = hourlyAgg.map((h) => ({
    date: h.date,
    hour: h.hour,
    messages: h._sum.messages ?? 0,
    voiceSeconds: h._sum.voiceSeconds ?? 0,
  }));

  // Daily timeseries — fill in missing days with 0
  const dailyByDate = new Map(dailyAgg.map((d) => [d.date, d]));
  const dailyPoints: DailyPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const key = dateKeyForDaysAgo(i);
    const row = dailyByDate.get(key);
    dailyPoints.push({
      date: key,
      messages: row?._sum.messages ?? 0,
      voiceMinutes: Math.round((row?._sum.voiceSeconds ?? 0) / 60),
    });
  }

  const channelNameById = new Map(channelInfo.map((c) => [c.channelId, c.name]));

  // Avatars for top users
  const topUserIds = topUsers.map((u) => u.userId);
  const topMembers = await prisma.member.findMany({
    where: { userId: { in: topUserIds } },
    select: { userId: true, avatarUrl: true, displayName: true },
  });
  const memberById = new Map(topMembers.map((m) => [m.userId, m]));

  const totalMessages = levelStats._sum.messageCount ?? 0;
  const totalVoice = levelStats._sum.voiceSeconds ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Insights</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Übersicht über die Aktivität auf deinem Server — letzte 30 Tage.
        </p>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Mitglieder" value={n(memberCount)} sublabel={`${n(activeUsers7d)} aktiv letzte 7 Tage`} />
        <Kpi label="Nachrichten gesamt" value={n(totalMessages)} sublabel={`über ${n(levelStats._count)} Member`} />
        <Kpi label="Voice gesamt" value={formatVoiceTime(totalVoice)} sublabel="kumuliert" />
        <Kpi
          label="Tickets"
          value={`${openTicketsCount} / ${closedTicketsCount}`}
          sublabel={`offen / geschlossen${avgRating._avg.rating ? ` · Ø ${avgRating._avg.rating.toFixed(1)} ⭐` : ""}`}
        />
        <Kpi label="Verwarnungen" value={n(warningsCount)} sublabel="gesamt" tone="amber" />
        <Kpi label="AutoMod-Wortliste" value={n(autoModWords)} sublabel="Wörter" tone="rose" />
        <Kpi label="Achievements" value={n(achievementsCount)} sublabel="definiert" tone="amber" />
        <Kpi
          label="Ø Nachrichten/Tag"
          value={n(Math.round(dailyPoints.reduce((s, p) => s + p.messages, 0) / 30))}
          sublabel="letzte 30 Tage"
        />
      </section>

      {/* Daily Trend */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Nachrichten + Voice — Trend</h2>
            <p className="text-xs text-ink-subtle">Tägliche Aktivität, letzte 30 Tage</p>
          </div>
        </div>
        <DailyChart points={dailyPoints} />
      </section>

      {/* Activity Heatmap */}
      <section className="card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Aktivitäts-Heatmap (Server)</h2>
          <p className="text-xs text-ink-subtle">
            Wann auf dem Server am aktivsten gechattet/gespeacht wird — letzte 30 Tage
          </p>
        </div>
        <ActivityHeatmap cells={cells} />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top Channels */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-semibold">Top Channels</h2>
          <p className="mb-4 text-xs text-ink-subtle">Nach Nachrichtenzahl, letzte 30 Tage</p>
          {channelAgg.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
              Noch keine Daten.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {channelAgg.map((c) => {
                const name = channelNameById.get(c.channelId) ?? `#${c.channelId.slice(-4)}`;
                const max = channelAgg[0]?._sum.messages ?? 1;
                const pct = ((c._sum.messages ?? 0) / max) * 100;
                return (
                  <li key={c.channelId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate text-ink">#{name}</span>
                      <span className="tabular-nums text-ink-muted">
                        {n(c._sum.messages ?? 0)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg-elevated">
                      <div
                        className="h-full rounded-full bg-brand-gradient"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Top User */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-semibold">Top XP-Sammler</h2>
          <p className="mb-4 text-xs text-ink-subtle">Aktivste Mitglieder gesamt</p>
          {topUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
              Noch keine Daten.
            </div>
          ) : (
            <ul className="space-y-2">
              {topUsers.map((u, i) => {
                const m = memberById.get(u.userId);
                const name = m?.displayName ?? u.displayName ?? `User ${u.userId.slice(-4)}`;
                const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
                return (
                  <li
                    key={u.userId}
                    className="flex items-center gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2"
                  >
                    <span className="text-sm font-medium tabular-nums w-6 text-center">
                      {medal}
                    </span>
                    {m?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full ring-1 ring-line"
                      />
                    ) : (
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-bg-elevated text-xs">
                        {name[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{name}</div>
                      <div className="text-[11px] text-ink-subtle">
                        Lvl {u.level} · {n(u.messageCount)} msg · {formatVoiceTime(u.voiceSeconds)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs tabular-nums">
                      <div className="font-medium text-ink">{n(u.xp)}</div>
                      <div className="text-[10px] text-ink-subtle">XP</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sublabel,
  tone = "brand",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "brand" | "amber" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-400"
      : tone === "rose"
        ? "text-rose-400"
        : "text-brand";
  return (
    <div className="card px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {sublabel && <div className="mt-0.5 text-[11px] text-ink-muted">{sublabel}</div>}
    </div>
  );
}
