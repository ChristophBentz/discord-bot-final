import Link from "next/link";
import { getConfig, prisma } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";
import { DashboardTabs } from "@/components/DashboardTabs";
import { LiveRefresh } from "@/components/LiveRefresh";

function StarRating({
  value,
  max = 5,
  size = "md",
  showValue = false,
}: {
  value: number;
  max?: number;
  size?: "sm" | "md";
  showValue?: boolean;
}) {
  const px = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < rounded;
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={`${px} ${filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-ink-subtle/40"}`}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          >
            <path d="m12 2.5 2.9 6.1 6.6.95-4.78 4.65 1.13 6.6L12 17.7l-5.85 3.1 1.13-6.6L2.5 9.55l6.6-.95L12 2.5z" />
          </svg>
        );
      })}
      {showValue && (
        <span className="ml-1 text-xs font-medium tabular-nums text-ink">{value.toFixed(1)}</span>
      )}
    </span>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} h`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

export default async function TicketsPage() {
  const [config, openTickets, closedTickets, channels, modStatsRaw, recentRatings] = await Promise.all([
    getConfig(),
    prisma.ticket.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { messages: true } } },
    }),
    prisma.ticket.findMany({
      where: { status: "closed" },
      orderBy: { closedAt: "desc" },
      take: 20,
      include: { _count: { select: { messages: true } } },
    }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.ticket.groupBy({
      by: ["closedBy"],
      where: { closedBy: { not: null }, status: "closed" },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.ticket.findMany({
      where: { rating: { not: null } },
      orderBy: { ratingAt: "desc" },
      take: 10,
    }),
  ]);

  // Avatare aus Member-Tabelle joinen
  const userIds = [
    ...openTickets,
    ...closedTickets,
    ...recentRatings,
  ].map((t) => t.userId);
  const closerIds = modStatsRaw
    .map((s) => s.closedBy)
    .filter((id): id is string => Boolean(id))
    .concat(recentRatings.map((r) => r.closedBy).filter((id): id is string => Boolean(id)));
  const members = await prisma.member.findMany({
    where: { userId: { in: [...userIds, ...closerIds] } },
    select: { userId: true, avatarUrl: true, displayName: true },
  });
  const memberById = new Map(members.map((m) => [m.userId, m]));

  // Mod-Stats mit Rating-Counts ergänzen (groupBy zählt _all, wir brauchen auch wie viele rated wurden)
  const ratedCounts = await prisma.ticket.groupBy({
    by: ["closedBy"],
    where: { closedBy: { not: null }, status: "closed", rating: { not: null } },
    _count: { _all: true },
  });
  const ratedCountByMod = new Map(ratedCounts.map((r) => [r.closedBy, r._count._all]));
  const modStats = modStatsRaw
    .filter((s) => s.closedBy)
    .map((s) => ({
      modId: s.closedBy!,
      totalClosed: s._count._all,
      ratedCount: ratedCountByMod.get(s.closedBy) ?? 0,
      avgRating: s._avg.rating,
    }))
    .sort((a, b) => b.totalClosed - a.totalClosed);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Utility</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tickets</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          User öffnen Tickets über den Button im Ticket-Channel. Du beantwortest sie hier — der Bot
          spiegelt deine Antwort in den Discord-Thread des Users.
        </p>
      </header>

      <DashboardTabs
        defaultTab="open"
        items={[
          {
            key: "open",
            label: "Offen",
            count: openTickets.length,
            attention: openTickets.length > 0,
            content: (
              <section className="card p-6">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Offene Tickets</h2>
                  <div className="flex items-center gap-2">
                    <LiveRefresh intervalMs={3000} />
                    <span className="badge">{openTickets.length}</span>
                  </div>
                </div>
                {openTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
                    Keine offenen Tickets.
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {openTickets.map((t) => {
                      const m = memberById.get(t.userId);
                      const name = m?.displayName ?? t.username ?? `User ${t.userId}`;
                      return (
                        <li key={t.id}>
                          <Link
                            href={`/dashboard/tickets/${t.id}`}
                            className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-bg-hover/30"
                          >
                            {m?.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.avatarUrl}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-full ring-1 ring-line"
                              />
                            ) : (
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                                {name[0]?.toUpperCase() ?? "?"}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                                  offen
                                </span>
                                <span className="font-medium">#{t.id}</span>
                                <span className="truncate text-sm">{name}</span>
                              </div>
                              <div className="mt-0.5 text-xs text-ink-subtle">
                                {t._count.messages} Nachrichten · geöffnet {timeAgo(t.createdAt)}
                              </div>
                            </div>
                            <span className="shrink-0 text-sm text-brand">Öffnen →</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ),
          },
          {
            key: "closed",
            label: "Geschlossen",
            count: closedTickets.length,
            content: (
              <section className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Geschlossene Tickets</h2>
                  <span className="badge">letzte 20</span>
                </div>
                {closedTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
                    Noch keine geschlossenen Tickets.
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {closedTickets.map((t) => {
                      const m = memberById.get(t.userId);
                      const name = m?.displayName ?? t.username ?? `User ${t.userId}`;
                      return (
                        <li key={t.id}>
                          <Link
                            href={`/dashboard/tickets/${t.id}`}
                            className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-bg-hover/30"
                          >
                            {m?.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.avatarUrl}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-full opacity-70 ring-1 ring-line"
                              />
                            ) : (
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-bg-elevated text-sm font-semibold text-ink-muted">
                                {name[0]?.toUpperCase() ?? "?"}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-muted">
                                  geschlossen
                                </span>
                                <span className="font-medium text-ink-muted">#{t.id}</span>
                                <span className="truncate text-sm text-ink-muted">{name}</span>
                              </div>
                              <div className="mt-0.5 text-xs text-ink-subtle">
                                {t._count.messages} Nachrichten · geschlossen{" "}
                                {t.closedAt ? timeAgo(t.closedAt) : "—"}
                              </div>
                            </div>
                            <span className="shrink-0 text-sm text-ink-muted">Anzeigen →</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ),
          },
          {
            key: "stats",
            label: "Statistik",
            content: (
              <div className="space-y-6">
                <section className="card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Mod-Statistik</h2>
                    <span className="badge">{modStats.length} Mods</span>
                  </div>
                  {modStats.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
                      Noch keine Mod-Statistik.
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead className="border-y border-line bg-bg-elevated/50 text-xs uppercase tracking-wide text-ink-subtle">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium">Mod</th>
                            <th className="px-3 py-2.5 text-right font-medium">Tickets</th>
                            <th className="px-3 py-2.5 text-right font-medium">Ø</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {modStats.map((m) => {
                            const member = memberById.get(m.modId);
                            const name = member?.displayName ?? `User ${m.modId.slice(-4)}`;
                            return (
                              <tr key={m.modId} className="hover:bg-bg-hover/50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {member?.avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={member.avatarUrl}
                                        alt=""
                                        className="h-7 w-7 rounded-full ring-1 ring-line"
                                      />
                                    ) : (
                                      <span className="grid h-7 w-7 place-items-center rounded-full bg-bg-elevated text-xs">
                                        {name[0]?.toUpperCase() ?? "?"}
                                      </span>
                                    )}
                                    <span className="font-medium">{name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums">{m.totalClosed}</td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                  {m.avgRating ? (
                                    <div className="flex flex-col items-end">
                                      <StarRating value={m.avgRating} size="sm" showValue />
                                      <div className="text-[10px] font-normal text-ink-subtle">
                                        {m.ratedCount} Bew.
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-ink-subtle">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Letzte Bewertungen</h2>
                    <span className="badge">{recentRatings.length}</span>
                  </div>
                  {recentRatings.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
                      Noch keine Bewertungen.
                    </div>
                  ) : (
                    <ul className="max-h-[400px] space-y-2 overflow-auto">
                      {recentRatings.map((r) => {
                        const user = memberById.get(r.userId);
                        const mod = r.closedBy ? memberById.get(r.closedBy) : null;
                        const userName = user?.displayName ?? r.username ?? `User ${r.userId.slice(-4)}`;
                        const modName = mod?.displayName ?? (r.closedBy ? `User ${r.closedBy.slice(-4)}` : "?");
                        const stars = r.rating ?? 0;
                        return (
                          <li
                            key={r.id}
                            className="rounded-xl border border-line bg-bg-elevated/40 p-3"
                          >
                            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-subtle">
                              <StarRating value={stars} />
                              <span className="text-ink-subtle/60">·</span>
                              <span>
                                Ticket{" "}
                                <Link
                                  href={`/dashboard/tickets/${r.id}`}
                                  className="text-brand hover:underline"
                                >
                                  #{r.id}
                                </Link>
                              </span>
                              <span className="text-ink-subtle/60">·</span>
                              <span>{userName}</span>
                              <span className="text-ink-subtle/60">·</span>
                              <span>
                                Beraten von <span className="text-ink">{modName}</span>
                              </span>
                              {r.ratingAt && (
                                <>
                                  <span className="text-ink-subtle/60">·</span>
                                  <span>{timeAgo(r.ratingAt)}</span>
                                </>
                              )}
                            </div>
                            {r.ratingComment && (
                              <p className="text-sm text-ink-muted">„{r.ratingComment}"</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            ),
          },
          {
            key: "settings",
            label: "Einstellungen",
            content: (
              <section className="card p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">Einstellungen</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Channel-Konfiguration, Transkript- und Bewertungs-Optionen
                  </p>
                </div>
                <SettingsForm
                  initial={{
                    ticketsEnabled: config.ticketsEnabled,
                    ticketChannelId: config.ticketChannelId,
                    ticketTranscriptEnabled: config.ticketTranscriptEnabled,
                    ticketTranscriptChannelId: config.ticketTranscriptChannelId,
                    ticketRatingEnabled: config.ticketRatingEnabled,
                    ticketRatingChannelId: config.ticketRatingChannelId,
                  }}
                  channels={channels.map((c) => ({
                    channelId: c.channelId,
                    name: c.name,
                    type: c.type,
                    parentId: c.parentId,
                    position: c.position,
                  }))}
                />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
