import Link from "next/link";
import { getConfig, prisma } from "@repo/db";
import { SettingsForm } from "./SettingsForm";
import { LiveRefresh } from "@/components/LiveRefresh";

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
  const [config, openTickets, closedTickets, channels] = await Promise.all([
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
  ]);

  // Avatare aus Member-Tabelle joinen
  const userIds = [...openTickets, ...closedTickets].map((t) => t.userId);
  const members = await prisma.member.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, avatarUrl: true, displayName: true },
  });
  const memberById = new Map(members.map((m) => [m.userId, m]));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Utility</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tickets</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          User öffnen Tickets über den Button im Ticket-Channel. Du beantwortest sie hier — der Bot
          spiegelt deine Antwort in den Discord-Thread des Users.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">Einstellungen</h2>
        <p className="mb-5 text-sm text-ink-muted">
          Welcher Channel zeigt das „Ticket öffnen"-Panel?
        </p>
        <SettingsForm
          initial={{
            ticketsEnabled: config.ticketsEnabled,
            ticketChannelId: config.ticketChannelId,
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

      {closedTickets.length > 0 && (
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Geschlossene Tickets</h2>
            <span className="badge">letzte 20</span>
          </div>
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
        </section>
      )}
    </div>
  );
}
