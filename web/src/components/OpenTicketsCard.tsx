import Link from "next/link";

export interface OpenTicketItem {
  id: number;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  topic: string | null;
  messageCount: number;
  createdAt: Date;
  lastActivity: Date;
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

export function OpenTicketsCard({ tickets }: { tickets: OpenTicketItem[] }) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold">
            🎫 Offene Tickets
          </div>
          <div className="text-xs text-ink-subtle">Klick zum Bearbeiten</div>
        </div>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
          {tickets.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-muted">
            Keine offenen Tickets. 🎉
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/dashboard/tickets/${t.id}`}
                  className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-bg-hover/40"
                >
                  {t.userAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.userAvatarUrl}
                      alt={t.userName}
                      className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-line"
                    />
                  ) : (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bg-elevated text-xs font-semibold text-ink-muted">
                      {(t.userName[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-ink-subtle">#{t.id}</span>
                      <span className="truncate text-sm font-medium text-ink">{t.userName}</span>
                    </div>
                    <div className="truncate text-xs leading-snug text-ink-muted">
                      {t.topic ?? "—"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-subtle">
                      {t.messageCount} {t.messageCount === 1 ? "Nachricht" : "Nachrichten"} ·{" "}
                      letzte {timeAgo(t.lastActivity)}
                    </div>
                  </div>
                  <span className="shrink-0 self-center text-xs text-brand">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
