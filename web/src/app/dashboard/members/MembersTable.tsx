"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface MemberRow {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string | null;
  topRoles: Array<{ id: string; name: string; color: number }>;
  isBot: boolean;
  level: number;
  xp: number;
  messageCount: number;
  voiceSeconds: number;
}

function formatVoice(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m % 60}m`;
}

function intToHex(color: number): string {
  if (color === 0) return "#a1a1aa";
  return "#" + color.toString(16).padStart(6, "0");
}

function joinedAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} Mon.`;
  const years = Math.floor(months / 12);
  return `${years} J.`;
}

export function MembersTable({ rows }: { rows: MemberRow[] }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"level" | "messages" | "voice" | "joined">("level");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter(
        (r) =>
          r.displayName.toLowerCase().includes(q) ||
          r.username.toLowerCase().includes(q) ||
          r.userId.includes(q),
      );
    }
    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "level":
          return b.xp - a.xp;
        case "messages":
          return b.messageCount - a.messageCount;
        case "voice":
          return b.voiceSeconds - a.voiceSeconds;
        case "joined":
          return (b.joinedAt ?? "").localeCompare(a.joinedAt ?? "");
      }
    });
    return sorted;
  }, [rows, query, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nach Name oder ID suchen…"
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-bg-elevated p-1 text-xs">
          {(
            [
              ["level", "Level"],
              ["messages", "Nachrichten"],
              ["voice", "Voice"],
              ["joined", "Beitritt"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                sortBy === key
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "text-ink-muted hover:bg-bg-hover hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-ink-muted">
            {rows.length === 0
              ? "Noch keine Mitglieder synchronisiert."
              : "Keine Treffer für deine Suche."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-line bg-bg-elevated/50 text-xs uppercase tracking-wide text-ink-subtle">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Mitglied</th>
                  <th className="px-3 py-3 text-left font-medium">Rollen</th>
                  <th className="px-3 py-3 text-right font-medium">Level</th>
                  <th className="px-3 py-3 text-right font-medium">Nachrichten</th>
                  <th className="px-3 py-3 text-right font-medium">Voice</th>
                  <th className="px-6 py-3 text-right font-medium">Beitritt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((m) => (
                  <tr key={m.userId} className="group transition-colors hover:bg-bg-hover/50">
                    <td className="px-6 py-3">
                      <Link href={`/dashboard/members/${m.userId}`} className="flex items-center gap-3">
                        {m.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.avatarUrl}
                            alt=""
                            className="h-9 w-9 rounded-full ring-1 ring-line"
                          />
                        ) : (
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                            {m.displayName[0]?.toUpperCase() ?? "?"}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{m.displayName}</span>
                            {m.isBot && (
                              <span className="rounded-md bg-icon-blue-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase text-icon-blue-fg">
                                Bot
                              </span>
                            )}
                          </div>
                          <div className="truncate font-mono text-[11px] text-ink-subtle">
                            {m.username} · {m.userId}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.topRoles.slice(0, 3).map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-bg-elevated px-1.5 py-0.5 text-[11px] font-medium"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: intToHex(r.color) }}
                            />
                            <span className="truncate max-w-[110px]">{r.name}</span>
                          </span>
                        ))}
                        {m.topRoles.length > 3 && (
                          <span className="text-[11px] text-ink-subtle">+{m.topRoles.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{m.level}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {m.messageCount.toLocaleString("de-DE")}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatVoice(m.voiceSeconds)}
                    </td>
                    <td className="px-6 py-3 text-right text-ink-muted tabular-nums">
                      {joinedAgo(m.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-ink-subtle">
        {filtered.length} von {rows.length} Mitgliedern
      </div>
    </div>
  );
}
