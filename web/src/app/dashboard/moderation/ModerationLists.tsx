"use client";

import { useState, useTransition } from "react";
import { removeTimeout, unbanMember } from "./actions";

export interface TimeoutEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  until: number;
}

export interface BanEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  reason: string | null;
}

function timeUntil(epochMs: number): string {
  const ms = epochMs - Date.now();
  if (ms <= 0) return "abgelaufen";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `noch ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `noch ${hours} h`;
  const days = Math.floor(hours / 24);
  return `noch ${days} Tag${days === 1 ? "" : "e"}`;
}

export function TimeoutList({ items }: { items: TimeoutEntry[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRemove = (userId: string) => {
    if (!confirm("Timeout aufheben?")) return;
    setError(null);
    setPendingId(userId);
    startTransition(async () => {
      const res = await removeTimeout(userId, "Aufgehoben via Moderation-Dashboard");
      if (!res.ok) setError(res.error);
      setPendingId(null);
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
        Kein User ist aktuell stummgeschaltet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}
      {items.map((t) => (
        <div
          key={t.userId}
          className={`flex items-center gap-3 rounded-xl border border-line bg-bg-elevated/40 p-3 transition-opacity ${pendingId === t.userId ? "opacity-40" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-line" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{t.displayName}</div>
            <div className="truncate font-mono text-[11px] text-ink-subtle">{t.userId}</div>
          </div>
          <div className="hidden text-right text-xs sm:block">
            <div className="text-ink-muted">{timeUntil(t.until)}</div>
            <div className="text-ink-subtle">
              bis {new Date(t.until).toLocaleString("de-DE", { hour12: false })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleRemove(t.userId)}
            disabled={isPending}
            className="shrink-0 rounded-lg border border-line bg-bg-card px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-emerald-500/30 hover:text-emerald-400 disabled:opacity-50"
          >
            Aufheben
          </button>
        </div>
      ))}
    </div>
  );
}

export function BanList({ items }: { items: BanEntry[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUnban = (userId: string) => {
    if (!confirm("Ban aufheben?")) return;
    setError(null);
    setPendingId(userId);
    startTransition(async () => {
      const res = await unbanMember(userId, "Aufgehoben via Moderation-Dashboard");
      if (!res.ok) setError(res.error);
      setPendingId(null);
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
        Keine aktiven Bans.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}
      {items.map((b) => (
        <div
          key={b.userId}
          className={`flex items-center gap-3 rounded-xl border border-line bg-bg-elevated/40 p-3 transition-opacity ${pendingId === b.userId ? "opacity-40" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-line" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{b.displayName}</span>
              <span className="rounded-md bg-icon-red-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase text-icon-red-fg">
                Gebannt
              </span>
            </div>
            <div className="truncate font-mono text-[11px] text-ink-subtle">{b.userId}</div>
            {b.reason && (
              <div className="mt-1 line-clamp-1 text-xs text-ink-muted">{b.reason}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleUnban(b.userId)}
            disabled={isPending}
            className="shrink-0 rounded-lg border border-line bg-bg-card px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-emerald-500/30 hover:text-emerald-400 disabled:opacity-50"
          >
            Unbannen
          </button>
        </div>
      ))}
    </div>
  );
}
