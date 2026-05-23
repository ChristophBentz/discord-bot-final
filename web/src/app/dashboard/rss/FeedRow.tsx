"use client";

import { useState, useTransition } from "react";
import type { ChannelOption } from "@/components/ChannelPicker";
import { checkFeedNow, deleteFeed, toggleFeed } from "./actions";
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
  const [checkMsg, setCheckMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isChecking, startCheck] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();

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

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onCheck}
            disabled={isChecking}
            className="btn btn-ghost text-xs"
            title="Jetzt prüfen"
          >
            {isChecking ? "…" : "Jetzt prüfen"}
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={isToggling}
            className="btn btn-ghost text-xs"
            title={feed.enabled ? "Pausieren" : "Aktivieren"}
          >
            {feed.enabled ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn btn-ghost text-xs"
          >
            Bearbeiten
          </button>
          {confirmDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
            >
              {isDeleting ? "…" : "Wirklich löschen?"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10"
            >
              Löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
