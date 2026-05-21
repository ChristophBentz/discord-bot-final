"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearPostHistory, deletePostHistory } from "./actions";

export interface PostRow {
  giveawayId: number;
  title: string;
  platform: string;
  postedAt: string;
}

export function PostHistory({ posts }: { posts: PostRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | "all" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmAll, setConfirmAll] = useState(false);

  const onDelete = (id: number) => {
    setPendingId(id);
    startTransition(async () => {
      await deletePostHistory(id);
      router.refresh();
      setPendingId(null);
    });
  };

  const onClearAll = () => {
    if (!confirmAll) {
      setConfirmAll(true);
      setTimeout(() => setConfirmAll(false), 4000);
      return;
    }
    setPendingId("all");
    startTransition(async () => {
      await clearPostHistory();
      router.refresh();
      setPendingId(null);
      setConfirmAll(false);
    });
  };

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
        Noch nichts gepostet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-subtle">
          Einträge dienen als Dedup — gelöschte werden beim nächsten Check wieder gepostet.
        </p>
        <button
          type="button"
          onClick={onClearAll}
          disabled={isPending}
          className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
            confirmAll
              ? "border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
              : "border-line bg-bg-elevated/60 text-ink-muted hover:border-rose-500/40 hover:text-rose-400"
          } disabled:opacity-50`}
        >
          {pendingId === "all"
            ? "Lösche…"
            : confirmAll
              ? "Wirklich alle löschen?"
              : "Alle löschen"}
        </button>
      </div>

      <ul className="space-y-1.5">
        {posts.map((p) => (
          <li
            key={p.giveawayId}
            className={`flex items-center justify-between gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 text-sm transition-opacity ${
              pendingId === p.giveawayId ? "opacity-40" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-ink">{p.title}</div>
              <div className="truncate text-[11px] text-ink-subtle">{p.platform}</div>
            </div>
            <span className="shrink-0 text-xs text-ink-muted">
              {new Date(p.postedAt).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              type="button"
              onClick={() => onDelete(p.giveawayId)}
              disabled={isPending}
              title="Aus Dedup-Liste entfernen → kann wieder gepostet werden"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-rose-500/15 hover:text-rose-400"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
