"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteWarning } from "./actions";

export interface WarningEntry {
  id: number;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  moderatorId: string;
  moderatorName: string;
  reason: string;
  createdAt: string;
}

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

export function WarningsList({ items }: { items: WarningEntry[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const onDelete = (id: number) => {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId((curr) => (curr === id ? null : curr)), 4000);
      return;
    }
    setPendingId(id);
    startTransition(async () => {
      await deleteWarning(id);
      router.refresh();
      setPendingId(null);
      setConfirmId(null);
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
        Noch keine Verwarnungen.
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.map((w) => {
        const isPendingDelete = pendingId === w.id;
        const isConfirming = confirmId === w.id;
        return (
          <li
            key={w.id}
            className={`flex items-center gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 transition-opacity ${
              isPendingDelete ? "opacity-40" : ""
            }`}
          >
            <Link
              href={`/dashboard/members/${w.userId}`}
              className="shrink-0"
              title="User-Profil öffnen"
            >
              {w.userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={w.userAvatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full ring-1 ring-line transition-opacity hover:opacity-80"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-bg-elevated text-xs font-semibold">
                  {w.userName[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <Link
                  href={`/dashboard/members/${w.userId}`}
                  className="font-medium text-ink hover:text-brand"
                >
                  {w.userName}
                </Link>
                <span className="text-[11px] text-ink-subtle">
                  von <span className="text-ink-muted">{w.moderatorName}</span> ·{" "}
                  {timeAgo(w.createdAt)}
                </span>
              </div>
              <div className="text-xs text-ink-muted line-clamp-2">{w.reason}</div>
            </div>
            <button
              type="button"
              onClick={() => onDelete(w.id)}
              disabled={isPending}
              title="Verwarnung entfernen"
              className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                isConfirming
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                  : "border-line bg-bg-elevated/60 text-ink-muted hover:border-rose-500/40 hover:text-rose-400"
              }`}
            >
              {isPendingDelete ? "…" : isConfirming ? "Wirklich?" : "🗑"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
