interface ActivityItem {
  id: string;
  user: string;
  initial: string;
  avatarUrl?: string | null;
  text: string;
  timestamp: Date;
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

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <div className="text-sm font-semibold">Zuletzt aktiv</div>
        <div className="text-xs text-ink-subtle">Nach letzter Nachricht sortiert</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Noch keine Aktivität.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                {item.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.avatarUrl}
                    alt={item.user}
                    className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-line"
                  />
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-xs font-semibold text-ink-muted">
                    {item.initial.toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{item.user}</div>
                  <div className="text-xs leading-snug text-ink-muted">{item.text}</div>
                </div>
                <div className="shrink-0 whitespace-nowrap text-[11px] text-ink-subtle">
                  {timeAgo(item.timestamp)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
