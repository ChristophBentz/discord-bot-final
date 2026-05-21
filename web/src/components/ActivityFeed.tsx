interface ActivityItem {
  id: string;
  user: string;
  initial: string;
  avatarUrl?: string | null;
  text: string;
  timestamp: Date;
  tone?: "violet" | "blue" | "green" | "amber" | "pink";
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

const TONE_BG: Record<NonNullable<ActivityItem["tone"]>, string> = {
  violet: "bg-icon-violet-bg text-icon-violet-fg",
  blue: "bg-icon-blue-bg text-icon-blue-fg",
  green: "bg-icon-green-bg text-icon-green-fg",
  amber: "bg-icon-amber-bg text-icon-amber-fg",
  pink: "bg-icon-pink-bg text-icon-pink-fg",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div className="text-base font-semibold">Live Aktivität</div>
          <div className="text-xs text-ink-subtle">Letzte Events</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
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
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold ${
                      TONE_BG[item.tone ?? "violet"]
                    }`}
                  >
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
