"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ChannelOption } from "@/components/ChannelPicker";
import { checkFeedNow, deleteFeed, resetFeedHistory, toggleFeed } from "./actions";
import type { FeedDTO, RoleOpt } from "./FeedManager";
import { FeedForm } from "./FeedForm";

interface Props {
  feed: FeedDTO;
  channels: ChannelOption[];
  roles: RoleOpt[];
  bot: { name: string; avatarUrl: string | null };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "noch nie geprüft";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `vor ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `vor ${min} Min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} h`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d === 1 ? "" : "en"}`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function FeedRow({ feed, channels, roles, bot }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [checkMsg, setCheckMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isChecking, startCheck] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isResetting, startReset] = useTransition();

  const channelName = channels.find((c) => c.channelId === feed.channelId)?.name ?? "?";
  const role = roles.find((r) => r.roleId === feed.pingRoleId);

  const onToggle = () => {
    startToggle(async () => {
      await toggleFeed(feed.id, !feed.enabled);
    });
  };

  const onCheck = () => {
    setCheckMsg(null);
    startCheck(async () => {
      const res = await checkFeedNow(feed.id);
      if (res.ok) {
        setCheckMsg({
          kind: "ok",
          text: res.initial
            ? `Initialer Lauf: ${res.posted} gepostet, ${res.fetched - res.posted} ältere stumm als „gesehen" markiert.`
            : `${res.posted} gepostet, ${res.skipped} schon bekannt (von ${res.fetched}).`,
        });
      } else {
        setCheckMsg({ kind: "error", text: res.error });
      }
    });
  };

  const onDelete = () => {
    startDelete(async () => {
      await deleteFeed(feed.id);
    });
  };

  const onReset = () => {
    setConfirmReset(false);
    setCheckMsg(null);
    startReset(async () => {
      const r = await resetFeedHistory(feed.id);
      if (!r.ok) {
        setCheckMsg({ kind: "error", text: r.error });
        return;
      }
      // Direkt im Anschluss neu prüfen → die neuesten Items werden gepostet.
      const res = await checkFeedNow(feed.id);
      if (res.ok) {
        setCheckMsg({
          kind: "ok",
          text: `Verlauf zurückgesetzt (${r.deleted} Einträge gelöscht). ${res.posted} neue Posts.`,
        });
      } else {
        setCheckMsg({
          kind: "error",
          text: `Verlauf zurückgesetzt, aber Posten fehlgeschlagen: ${res.error}`,
        });
      }
    });
  };

  if (editing) {
    return (
      <div className="rounded-2xl border border-brand/40 bg-brand/5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Feed bearbeiten</h3>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-ink-muted hover:text-ink"
          >
            Abbrechen
          </button>
        </div>
        <FeedForm
          channels={channels}
          roles={roles}
          bot={bot}
          initial={feed}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-bg-elevated/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${feed.enabled ? "bg-emerald-400" : "bg-zinc-500"}`}
              title={feed.enabled ? "aktiv" : "pausiert"}
            />
            <h3 className="truncate text-sm font-semibold text-ink">{feed.name}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <a
              href={feed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:text-ink hover:underline"
              title={feed.url}
            >
              {hostnameOf(feed.url)}
            </a>
            <span>→ #{channelName}</span>
            <span>
              alle{" "}
              {feed.intervalMin < 60
                ? `${feed.intervalMin} Min`
                : `${feed.intervalMin / 60} h`}
            </span>
            {role && (
              <span className="text-brand">@{role.name}</span>
            )}
            <span className="text-ink-subtle">· {timeAgo(feed.lastCheck)}</span>
          </div>
          {feed.lastError && (
            <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-2 py-1 text-xs text-rose-300">
              ⚠ {feed.lastError}
            </div>
          )}
          {checkMsg && (
            <div
              className={`mt-2 rounded-md border px-2 py-1 text-xs ${
                checkMsg.kind === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/5 text-rose-300"
              }`}
            >
              {checkMsg.text}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            onClick={onCheck}
            disabled={isChecking}
            label="Jetzt prüfen"
            loading={isChecking}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
          </IconButton>

          <IconButton
            onClick={onToggle}
            disabled={isToggling}
            label={feed.enabled ? "Pausieren" : "Aktivieren"}
          >
            {feed.enabled ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </IconButton>

          <IconButton onClick={() => setEditing(true)} label="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </IconButton>

          {confirmReset ? (
            <button
              type="button"
              onClick={onReset}
              disabled={isResetting}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-2.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
              title="Löscht den Verlauf und postet die neuesten Artikel erneut"
            >
              {isResetting ? "…" : "Sicher?"}
            </button>
          ) : (
            <IconButton
              onClick={() => setConfirmReset(true)}
              label="Neu posten (Verlauf leeren)"
              tone="amber"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            </IconButton>
          )}

          {confirmDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/15 px-2.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/25"
            >
              {isDeleting ? "…" : "Wirklich?"}
            </button>
          ) : (
            <IconButton
              onClick={() => setConfirmDelete(true)}
              label="Feed löschen"
              tone="rose"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  disabled,
  loading,
  label,
  tone = "default",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  tone?: "default" | "amber" | "rose";
  children: ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/30"
      : tone === "rose"
        ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30"
        : "text-ink-muted hover:bg-bg-hover hover:text-ink hover:border-line-strong";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {loading ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.2-8.55" strokeLinecap="round" />
        </svg>
      ) : (
        children
      )}
    </button>
  );
}
