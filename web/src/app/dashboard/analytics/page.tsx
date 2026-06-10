import Link from "next/link";
import { prisma } from "@repo/db";
import {
  ActivityHeatmap,
  type ActivityCell,
} from "../members/[userId]/ActivityHeatmap";
import { DailyChart, type DailyPoint } from "./DailyChart";
import { RangeSelector } from "./RangeSelector";

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

function timeAgo(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} h`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const rangeRaw = Number(params.range ?? "30");
  const range = [7, 30, 90].includes(rangeRaw) ? rangeRaw : 30;

  const rangeStartDate = new Date();
  rangeStartDate.setDate(rangeStartDate.getDate() - range);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const rangeStartStr = dateKeyForDaysAgo(range - 1);

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
    recentWarnings,
    inviterAgg,
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
      where: { date: { gte: rangeStartStr } },
      _sum: { messages: true, voiceSeconds: true },
    }),
    prisma.hourlyActivity.groupBy({
      by: ["date"],
      where: { date: { gte: rangeStartStr } },
      _sum: { messages: true, voiceSeconds: true },
    }),
    prisma.channelActivity.groupBy({
      by: ["channelId"],
      where: { date: { gte: rangeStartStr } },
      _sum: { messages: true },
      orderBy: { _sum: { messages: "desc" } },
      take: 10,
    }),
    prisma.levelUser.findMany({ orderBy: { xp: "desc" }, take: 5 }),
    prisma.guildChannel.findMany({ select: { channelId: true, name: true } }),
    prisma.warning.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.inviteUse.groupBy({
      by: ["inviterId"],
      where: { inviterId: { not: null }, joinedAt: { gte: new Date(rangeStartStr) } },
      _count: { _all: true },
      orderBy: { _count: { inviterId: "desc" } },
      take: 5,
    }),
  ]);

  const topInviters = inviterAgg
    .filter((i) => i.inviterId !== null)
    .map((i) => ({ inviterId: i.inviterId as string, invites: i._count._all }));

  const cells: ActivityCell[] = hourlyAgg.map((h) => ({
    date: h.date,
    hour: h.hour,
    messages: h._sum.messages ?? 0,
    voiceSeconds: h._sum.voiceSeconds ?? 0,
  }));

  const dailyByDate = new Map(dailyAgg.map((d) => [d.date, d]));
  const dailyPoints: DailyPoint[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const key = dateKeyForDaysAgo(i);
    const row = dailyByDate.get(key);
    dailyPoints.push({
      date: key,
      messages: row?._sum.messages ?? 0,
      voiceMinutes: Math.round((row?._sum.voiceSeconds ?? 0) / 60),
    });
  }

  const channelNameById = new Map(channelInfo.map((c) => [c.channelId, c.name]));

  const allMemberIds = [
    ...topUsers.map((u) => u.userId),
    ...recentWarnings.map((w) => w.userId),
    ...recentWarnings.map((w) => w.moderatorId),
    ...topInviters.map((i) => i.inviterId),
  ];
  const members = await prisma.member.findMany({
    where: { userId: { in: allMemberIds } },
    select: { userId: true, avatarUrl: true, displayName: true },
  });
  const memberById = new Map(members.map((m) => [m.userId, m]));

  const totalMessages = levelStats._sum.messageCount ?? 0;
  const totalVoice = levelStats._sum.voiceSeconds ?? 0;
  const avgPerDay = Math.round(
    dailyPoints.reduce((s, p) => s + p.messages, 0) / Math.max(1, range),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Insights</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Übersicht über die Aktivität auf deinem Server. Klick auf Karten und Listen für Details.
          </p>
        </div>
        <RangeSelector current={range} />
      </header>

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Mitglieder"
          value={n(memberCount)}
          sublabel={`${n(activeUsers7d)} aktiv letzte 7 Tage`}
          href="/dashboard/members"
        />
        <Kpi
          label="Tickets"
          value={`${openTicketsCount} / ${closedTicketsCount}`}
          sublabel={`offen / geschlossen${avgRating._avg.rating ? ` · Ø ${avgRating._avg.rating.toFixed(1)} ⭐` : ""}`}
          href="/dashboard/tickets"
        />
        <Kpi
          label="Verwarnungen"
          value={n(warningsCount)}
          sublabel="gesamt"
          tone="amber"
          href="/dashboard/moderation"
        />
        <Kpi
          label="Achievements"
          value={n(achievementsCount)}
          sublabel="definiert"
          href="/dashboard/achievements"
        />
        <Kpi
          label="Nachrichten gesamt"
          value={n(totalMessages)}
          sublabel={`über ${n(levelStats._count)} Member`}
        />
        <Kpi label="Voice gesamt" value={formatVoiceTime(totalVoice)} sublabel="kumuliert" />
        <Kpi
          label="AutoMod-Wortliste"
          value={n(autoModWords)}
          sublabel="Wörter"
          tone="rose"
          href="/dashboard/automod"
        />
        <Kpi
          label="Ø Nachrichten/Tag"
          value={n(avgPerDay)}
          sublabel={`letzte ${range} Tage`}
        />
      </section>

      {/* Daily Trend */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Nachrichten + Voice — Trend</h2>
            <p className="text-xs text-ink-subtle">
              Tägliche Aktivität, letzte {range} Tage
            </p>
          </div>
        </div>
        <DailyChart points={dailyPoints} />
      </section>

      {/* Activity Heatmap */}
      <section className="card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Aktivitäts-Heatmap (Server)</h2>
          <p className="text-xs text-ink-subtle">
            Wann auf dem Server am aktivsten gechattet/gespeacht wird
          </p>
        </div>
        <ActivityHeatmap cells={cells} />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top Channels — klickbar */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-semibold">Top Channels</h2>
          <p className="mb-4 text-xs text-ink-subtle">
            Klick für Channel-Details · letzte {range} Tage
          </p>
          {channelAgg.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
              Noch keine Daten.
            </div>
          ) : (
            <ul className="space-y-1">
              {channelAgg.map((c) => {
                const name = channelNameById.get(c.channelId) ?? `#${c.channelId.slice(-4)}`;
                const max = channelAgg[0]?._sum.messages ?? 1;
                const pct = ((c._sum.messages ?? 0) / max) * 100;
                return (
                  <li key={c.channelId}>
                    <Link
                      href={`/dashboard/analytics/channel/${c.channelId}?range=${range}`}
                      className="block space-y-1 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-bg-hover/50"
                    >
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Top User — klickbar */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-semibold">Top XP-Sammler</h2>
          <p className="mb-4 text-xs text-ink-subtle">Klick für Profil-Details</p>
          {topUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
              Noch keine Daten.
            </div>
          ) : (
            <ul className="space-y-1">
              {topUsers.map((u, i) => {
                const m = memberById.get(u.userId);
                const name = m?.displayName ?? u.displayName ?? `User ${u.userId.slice(-4)}`;
                const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
                return (
                  <li key={u.userId}>
                    <Link
                      href={`/dashboard/members/${u.userId}`}
                      className="flex items-center gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 transition-colors hover:bg-bg-hover/60"
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Top Inviter — klickbar */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-semibold">Top Inviter</h2>
          <p className="mb-4 text-xs text-ink-subtle">
            Wer die meisten neuen Mitglieder eingeladen hat (im gewählten Zeitraum)
          </p>
          {topInviters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
              Noch keine Invite-Daten — Joins werden ab jetzt erfasst.
            </div>
          ) : (
            <ul className="space-y-1">
              {topInviters.map((inv, i) => {
                const m = memberById.get(inv.inviterId);
                const name = m?.displayName ?? `User ${inv.inviterId.slice(-4)}`;
                const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
                return (
                  <li key={inv.inviterId}>
                    <Link
                      href={`/dashboard/members/${inv.inviterId}`}
                      className="flex items-center gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 transition-colors hover:bg-bg-hover/60"
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
                      <div className="min-w-0 flex-1 truncate text-sm font-medium">{name}</div>
                      <div className="shrink-0 text-right text-xs tabular-nums">
                        <div className="font-medium text-ink">{inv.invites}</div>
                        <div className="text-[10px] text-ink-subtle">
                          {inv.invites === 1 ? "Invite" : "Invites"}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Letzte Verwarnungen */}
      {recentWarnings.length > 0 && (
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Letzte Verwarnungen</h2>
              <p className="text-xs text-ink-subtle">Klick für User-Profil</p>
            </div>
            <Link
              href="/dashboard/moderation"
              className="text-xs text-brand hover:underline"
            >
              Alle anzeigen →
            </Link>
          </div>
          <ul className="space-y-1.5">
            {recentWarnings.map((w) => {
              const user = memberById.get(w.userId);
              const mod = memberById.get(w.moderatorId);
              const userName = user?.displayName ?? `User ${w.userId.slice(-4)}`;
              const modName = mod?.displayName ?? `Mod ${w.moderatorId.slice(-4)}`;
              return (
                <li key={w.id}>
                  <Link
                    href={`/dashboard/members/${w.userId}`}
                    className="flex items-center gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 transition-colors hover:bg-bg-hover/60"
                  >
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full ring-1 ring-line"
                      />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-bg-elevated text-xs">
                        {userName[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-ink">{userName}</span>
                        <span className="text-[11px] text-ink-subtle">
                          von {modName} · {timeAgo(w.createdAt)}
                        </span>
                      </div>
                      <div className="truncate text-xs text-ink-muted">{w.reason}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sublabel,
  tone = "brand",
  href,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "brand" | "amber" | "rose";
  href?: string;
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-400"
      : tone === "rose"
        ? "text-rose-400"
        : "text-brand";
  const body = (
    <div className={`card px-5 py-4 ${href ? "transition-colors hover:bg-bg-hover/30 cursor-pointer" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
          {label}
        </div>
        {href && (
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 text-ink-subtle"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        )}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {sublabel && <div className="mt-0.5 text-[11px] text-ink-muted">{sublabel}</div>}
    </div>
  );
  if (href) return <Link href={href}>{body}</Link>;
  return body;
}
