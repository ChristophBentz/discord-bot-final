"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export interface MemberRow {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string | null;
  topRoles: Array<{ id: string; name: string; color: number }>;
  /** Alle Rollen-IDs (für Role-Filter) */
  roleIds: string[];
  isBot: boolean;
  level: number;
  xp: number;
  messageCount: number;
  voiceSeconds: number;
}

export interface RoleOption {
  id: string;
  name: string;
  color: number;
  memberCount: number;
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

export function MembersTable({
  rows,
  allRoles,
}: {
  rows: MemberRow[];
  allRoles: RoleOption[];
}) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"level" | "messages" | "voice" | "joined">("level");
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter(
        (r) =>
          r.displayName.toLowerCase().includes(q) ||
          r.username.toLowerCase().includes(q) ||
          r.userId.includes(q) ||
          r.topRoles.some((role) => role.name.toLowerCase().includes(q)),
      );
    }
    if (selectedRoleIds.size > 0) {
      result = result.filter((r) => r.roleIds.some((id) => selectedRoleIds.has(id)));
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
  }, [rows, query, sortBy, selectedRoleIds]);

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
            placeholder="Name, ID oder Rolle…"
            className="input pl-9"
          />
        </div>
        <RoleFilter
          allRoles={allRoles}
          selectedIds={selectedRoleIds}
          onChange={setSelectedRoleIds}
        />
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

function RoleFilter({
  allRoles,
  selectedIds,
  onChange,
}: {
  allRoles: RoleOption[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = allRoles.filter((r) =>
    search ? r.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
          selectedIds.size > 0
            ? "border-brand/40 bg-brand/10 text-brand"
            : "border-line bg-bg-elevated text-ink-muted hover:border-brand/40 hover:text-ink"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
        Rollen
        {selectedIds.size > 0 && (
          <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {selectedIds.size}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-line bg-bg-elevated shadow-card-lg">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rolle suchen…"
              className="w-full rounded-lg bg-bg-card px-3 py-2 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand/30"
            />
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="mt-1 w-full rounded-md py-1 text-xs text-rose-400 hover:bg-rose-500/10"
              >
                Auswahl zurücksetzen ({selectedIds.size})
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-ink-muted">
                Keine Rolle gefunden.
              </div>
            ) : (
              filtered.map((r) => {
                const checked = selectedIds.has(r.id);
                const c = intToHex(r.color);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggle(r.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      checked ? "bg-brand/15" : "hover:bg-bg-hover"
                    }`}
                  >
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                        checked
                          ? "border-brand bg-brand text-white"
                          : "border-line"
                      }`}
                    >
                      {checked && (
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12 5 5L20 7" />
                        </svg>
                      )}
                    </span>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                    <span className="flex-1 truncate" style={{ color: c }}>
                      {r.name}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-ink-subtle">
                      {r.memberCount}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {selectedIds.size > 1 && (
            <div className="border-t border-line bg-bg-card/50 px-3 py-2 text-[10px] text-ink-subtle">
              Member wird angezeigt wenn er <strong>mindestens eine</strong> der gewählten Rollen hat.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
