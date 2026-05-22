import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { DailyChart, type DailyPoint } from "../../DailyChart";
import { RangeSelector } from "../../RangeSelector";

function dateKeyForDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function n(x: number): string {
  return x.toLocaleString("de-DE");
}

export default async function ChannelAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { channelId } = await params;
  const sp = await searchParams;
  const rangeRaw = Number(sp.range ?? "30");
  const range = [7, 30, 90].includes(rangeRaw) ? rangeRaw : 30;
  const rangeStartStr = dateKeyForDaysAgo(range - 1);

  const channel = await prisma.guildChannel.findUnique({ where: { channelId } });
  if (!channel) notFound();

  const [
    dailyAgg,
    contributors,
    totalMessages,
    activeUserCount,
  ] = await Promise.all([
    prisma.channelActivity.groupBy({
      by: ["date"],
      where: { channelId, date: { gte: rangeStartStr } },
      _sum: { messages: true },
    }),
    prisma.channelActivity.groupBy({
      by: ["userId"],
      where: { channelId, date: { gte: rangeStartStr } },
      _sum: { messages: true },
      orderBy: { _sum: { messages: "desc" } },
      take: 10,
    }),
    prisma.channelActivity.aggregate({
      _sum: { messages: true },
      where: { channelId, date: { gte: rangeStartStr } },
    }),
    prisma.channelActivity
      .groupBy({
        by: ["userId"],
        where: { channelId, date: { gte: rangeStartStr } },
      })
      .then((rows) => rows.length),
  ]);

  // Daily series (gefüllt mit 0en für Tage ohne Aktivität)
  const dailyByDate = new Map(dailyAgg.map((d) => [d.date, d]));
  const dailyPoints: DailyPoint[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const key = dateKeyForDaysAgo(i);
    const row = dailyByDate.get(key);
    dailyPoints.push({
      date: key,
      messages: row?._sum.messages ?? 0,
      voiceMinutes: 0,
    });
  }

  const memberInfo = await prisma.member.findMany({
    where: { userId: { in: contributors.map((c) => c.userId) } },
    select: { userId: true, avatarUrl: true, displayName: true },
  });
  const memberById = new Map(memberInfo.map((m) => [m.userId, m]));

  const total = totalMessages._sum.messages ?? 0;
  const avgPerDay = Math.round(total / Math.max(1, range));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-ink-subtle">
          <Link href="/dashboard/analytics" className="hover:text-ink">
            Analytics
          </Link>
          <span>›</span>
          <span>Channel-Details</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">#{channel.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Channel-Analytics · {n(total)} Nachrichten · {n(activeUserCount)} aktive User
            </p>
          </div>
          <RangeSelector current={range} />
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-ink-subtle">Nachrichten</div>
          <div className="mt-1 text-2xl font-semibold text-brand">{n(total)}</div>
          <div className="mt-0.5 text-[11px] text-ink-muted">letzte {range} Tage</div>
        </div>
        <div className="card px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-ink-subtle">Aktive User</div>
          <div className="mt-1 text-2xl font-semibold text-brand">{n(activeUserCount)}</div>
          <div className="mt-0.5 text-[11px] text-ink-muted">haben hier gepostet</div>
        </div>
        <div className="card px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-ink-subtle">Ø pro Tag</div>
          <div className="mt-1 text-2xl font-semibold text-brand">{n(avgPerDay)}</div>
          <div className="mt-0.5 text-[11px] text-ink-muted">Nachrichten</div>
        </div>
      </section>

      {/* Trend */}
      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">Tägliche Aktivität</h2>
        <p className="mb-4 text-xs text-ink-subtle">letzte {range} Tage</p>
        <DailyChart points={dailyPoints} />
      </section>

      {/* Top Poster */}
      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">Top Poster in diesem Channel</h2>
        <p className="mb-4 text-xs text-ink-subtle">Klick für User-Profil</p>
        {contributors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
            Noch keine Aktivität in diesem Zeitraum.
          </div>
        ) : (
          <ul className="space-y-1">
            {contributors.map((c, i) => {
              const m = memberById.get(c.userId);
              const name = m?.displayName ?? `User ${c.userId.slice(-4)}`;
              const max = contributors[0]?._sum.messages ?? 1;
              const pct = ((c._sum.messages ?? 0) / max) * 100;
              const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
              return (
                <li key={c.userId}>
                  <Link
                    href={`/dashboard/members/${c.userId}`}
                    className="flex items-center gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 transition-colors hover:bg-bg-hover/60"
                  >
                    <span className="w-6 text-center text-sm tabular-nums">{medal}</span>
                    {m?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full ring-1 ring-line"
                      />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-bg-elevated text-xs">
                        {name[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{name}</div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
                        <div
                          className="h-full rounded-full bg-brand-gradient"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs tabular-nums">
                      <div className="font-medium text-ink">{n(c._sum.messages ?? 0)}</div>
                      <div className="text-[10px] text-ink-subtle">Nachrichten</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
