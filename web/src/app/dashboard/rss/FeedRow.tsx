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

  const intervalLabel =
    feed.intervalMin < 60 ? `${feed.intervalMin} Min` : `${feed.intervalMin / 60} h`;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-bg-elevated/30 transition-colors hover:border-line-strong">
      {/* Header — Name + Status-Badge */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-ink">{feed.name}</h3>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                feed.enabled
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-zinc-500/15 text-zinc-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  feed.enabled ? "bg-emerald-400" : "bg-zinc-500"
                }`}
              />
              {feed.enabled ? "Aktiv" : "Pausiert"}
            </span>
          </div>
          <a
            href={feed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-ink-muted hover:text-ink hover:underline"
            title={feed.url}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M4 11a9 9 0 0 1 9 9" />
              <path d="M4 4a16 16 0 0 1 16 16" />
              <circle cx="5" cy="19" r="1" />
            </svg>
            {hostnameOf(feed.url)}
          </a>
        </div>
      </div>

      {/* Meta-Pills */}
      <div className="mt-3 flex flex-wrap gap-2 px-5">
        <Pill
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M3 5h18M3 12h18M3 19h18" />
            </svg>
          }
        >
          <span className="text-ink-subtle">Channel</span>
          <span className="font-medium text-ink">#{channelName}</span>
        </Pill>
        <Pill
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          }
        >
          <span className="text-ink-subtle">alle</span>
          <span className="font-medium text-ink">{intervalLabel}</span>
        </Pill>
        {role && (
          <Pill
            tone="brand"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          >
            <span className="font-medium">@{role.name}</span>
          </Pill>
        )}
        <Pill>
          <span className="text-ink-subtle">Geprüft</span>
          <span className="font-medium text-ink">{timeAgo(feed.lastCheck)}</span>
        </Pill>
      </div>

      {/* Error / Status messages */}
      {(feed.lastError || checkMsg) && (
        <div className="mt-3 space-y-2 px-5">
          {feed.lastError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>{feed.lastError}</span>
            </div>
          )}
          {checkMsg && (
            <div
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                checkMsg.kind === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/5 text-rose-300"
              }`}
            >
              {checkMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Action-Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-bg-elevated/40 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <ActionButton
            onClick={onCheck}
            disabled={isChecking}
            loading={isChecking}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 4v5h-5" />
              </svg>
            }
          >
            Jetzt prüfen
          </ActionButton>

          <ActionButton
            onClick={onToggle}
            disabled={isToggling}
            icon={
              feed.enabled ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )
            }
          >
            {feed.enabled ? "Pausieren" : "Aktivieren"}
          </ActionButton>

          <ActionButton
            onClick={() => setEditing(true)}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
          >
            Bearbeiten
          </ActionButton>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {confirmReset ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-bg-hover hover:text-ink"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onReset}
                disabled={isResetting}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
              >
                {isResetting ? "Lädt…" : "Ja, neu posten"}
              </button>
            </div>
          ) : (
            <ActionButton
              onClick={() => setConfirmReset(true)}
              tone="amber"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              }
            >
              Neu posten
            </ActionButton>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-bg-hover hover:text-ink"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/50 bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/25"
              >
                {isDeleting ? "Lösche…" : "Ja, löschen"}
              </button>
            </div>
          ) : (
            <ActionButton
              onClick={() => setConfirmDelete(true)}
              tone="rose"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              }
            >
              Löschen
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({
  children,
  icon,
  tone = "default",
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "brand";
}) {
  const toneClass =
    tone === "brand"
      ? "border-brand/30 bg-brand/10 text-brand-light"
      : "border-line bg-bg-elevated text-ink-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${toneClass}`}
    >
      {icon}
      {children}
    </span>
  );
}

function ActionButton({
  onClick,
  disabled,
  loading,
  icon,
  tone = "default",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: ReactNode;
  tone?: "default" | "amber" | "rose";
  children: ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
      : tone === "rose"
        ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
        : "text-ink-muted hover:bg-bg-hover hover:text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {loading ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.2-8.55" strokeLinecap="round" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

