import Link from "next/link";

export interface ModEventEntry {
  id: number;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  moderatorName: string | null;
  action: string;
  detail: string | null;
  createdAt: string;
}

const ACTION_INFO: Record<string, { label: string; tone: string }> = {
  kick: { label: "Gekickt", tone: "bg-amber-500/15 text-amber-400" },
  timeout: { label: "Timeout", tone: "bg-rose-500/15 text-rose-400" },
  timeoutEnd: { label: "Timeout aufgehoben", tone: "bg-emerald-500/15 text-emerald-400" },
  voiceMove: { label: "Voice-Move", tone: "bg-blue-500/15 text-blue-400" },
  voiceDisconnect: { label: "Voice-Kick", tone: "bg-orange-500/15 text-orange-400" },
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} h`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

export function ModEventsList({ items }: { items: ModEventEntry[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
        Noch keine Mod-Aktionen aufgezeichnet.
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.map((e) => {
        const info = ACTION_INFO[e.action] ?? {
          label: e.action,
          tone: "bg-bg-elevated text-ink-muted",
        };
        return (
          <li
            key={e.id}
            className="flex items-center gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2"
          >
            <Link
              href={`/dashboard/members/${e.userId}`}
              className="shrink-0"
              title="User-Profil öffnen"
            >
              {e.userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.userAvatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full ring-1 ring-line transition-opacity hover:opacity-80"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-bg-elevated text-xs font-semibold">
                  {e.userName[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <Link
                  href={`/dashboard/members/${e.userId}`}
                  className="font-medium text-ink hover:text-brand"
                >
                  {e.userName}
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${info.tone}`}
                >
                  {info.label}
                </span>
                <span className="text-[11px] text-ink-subtle">
                  {e.moderatorName ? (
                    <>
                      von <span className="text-ink-muted">{e.moderatorName}</span> ·{" "}
                    </>
                  ) : null}
                  {timeAgo(e.createdAt)}
                </span>
              </div>
              {e.detail && (
                <div className="text-xs text-ink-muted line-clamp-2">{e.detail}</div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
