"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  musicPause,
  musicPlay,
  musicResume,
  musicSkip,
  musicStop,
  musicVolume,
} from "./actions";

interface MusicState {
  enabled: boolean;
  voiceChannel: { id: string; name: string } | null;
  current: {
    title: string;
    author: string;
    url: string;
    thumbnail: string;
    durationMs: number;
    progressMs: number;
    requestedBy: string | null;
  } | null;
  paused: boolean;
  repeatMode: "off" | "track" | "queue" | "autoplay";
  volume: number;
  upcoming: Array<{
    title: string;
    author: string;
    durationMs: number;
    requestedBy: string | null;
  }>;
  totalQueueSize: number;
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerPanel({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<MusicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Volume: lokaler Slider-Wert (sofortiges UI-Feedback) + debounced API-Call.
  const [volumeLocal, setVolumeLocal] = useState<number | null>(null);
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userDraggingVolume = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/music/state", { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean; state?: MusicState; error?: string };
        if (cancelled) return;
        if (json.ok && json.state) {
          setState(json.state);
          if (!userDraggingVolume.current) {
            setVolumeLocal(json.state.volume);
          }
          setError(null);
        } else {
          setError(json.error ?? "Konnte Status nicht laden.");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) timer = setTimeout(tick, document.hidden ? 10_000 : 3000);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!enabled) {
    return (
      <div className="card p-6 text-center text-sm text-ink-muted">
        Music-Feature ist im Toggle oben deaktiviert.
      </div>
    );
  }

  const onPlay = () => {
    if (!query.trim()) return;
    startTransition(async () => {
      const res = await musicPlay(query);
      if (res.ok) setQuery("");
      else setError(res.error);
    });
  };

  const onAction = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => () => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
    });
  };

  const current = state?.current;
  const progressPct =
    current && current.durationMs > 0
      ? Math.min(100, Math.max(0, (current.progressMs / current.durationMs) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* Add to Queue */}
      <div className="card p-5">
        <div className="mb-3 text-sm font-medium text-ink">Hinzufügen</div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onPlay();
              }
            }}
            placeholder="YouTube/Spotify/SoundCloud-Link oder Suchbegriff…"
            className="input flex-1"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={onPlay}
            disabled={isPending || !query.trim()}
            className="btn-primary shrink-0 disabled:opacity-60"
          >
            ▶ Play
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-subtle">
          Du musst in einem Voice-Channel sein — Bot joint deinen Channel.
        </p>
      </div>

      {/* Now Playing */}
      <div className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">
            Now Playing
          </div>
          {state?.voiceChannel && (
            <span className="badge">🔊 {state.voiceChannel.name}</span>
          )}
        </div>

        {!current ? (
          <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-5 py-10 text-center text-sm text-ink-muted">
            Nichts läuft gerade.
          </div>
        ) : (
          <div className="flex gap-5">
            {current.thumbnail && (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-bg-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.thumbnail} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold text-ink">{current.title}</div>
              <div className="mt-0.5 truncate text-sm text-ink-muted">{current.author}</div>
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-elevated">
                  <div
                    className="h-full rounded-full bg-brand-gradient transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] tabular-nums text-ink-subtle">
                  <span>{formatMs(current.progressMs)}</span>
                  <span>{formatMs(current.durationMs)}</span>
                </div>
              </div>
              {current.requestedBy && (
                <div className="mt-2 text-xs text-ink-subtle">
                  Wunsch von <span className="text-ink">{current.requestedBy}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {state?.paused ? (
            <button
              type="button"
              onClick={onAction(musicResume)}
              disabled={!current || isPending}
              className="btn-primary disabled:opacity-40"
            >
              ▶ Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={onAction(musicPause)}
              disabled={!current || isPending}
              className="btn-secondary disabled:opacity-40"
            >
              ⏸ Pause
            </button>
          )}
          <button
            type="button"
            onClick={onAction(musicSkip)}
            disabled={!current || isPending}
            className="btn-secondary disabled:opacity-40"
          >
            ⏭ Skip
          </button>
          <button
            type="button"
            onClick={onAction(musicStop)}
            disabled={!current || isPending}
            className="btn-secondary disabled:opacity-40"
          >
            ⏹ Stop
          </button>
        </div>

        {/* Volume */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-ink-subtle">🔊</span>
          <input
            type="range"
            min={0}
            max={200}
            value={volumeLocal ?? state?.volume ?? 20}
            disabled={!current}
            onPointerDown={() => (userDraggingVolume.current = true)}
            onPointerUp={() => {
              userDraggingVolume.current = false;
            }}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolumeLocal(v);
              if (volumeTimer.current) clearTimeout(volumeTimer.current);
              volumeTimer.current = setTimeout(() => {
                void musicVolume(v).then((r) => {
                  if (!r.ok) setError(r.error);
                });
              }, 200);
            }}
            className="flex-1 accent-brand disabled:opacity-40"
          />
          <span className="w-12 text-right text-xs tabular-nums text-ink-muted">
            {volumeLocal ?? state?.volume ?? 20}%
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
            {error}
          </div>
        )}
      </div>

      {/* Queue */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Queue</h2>
          <span className="badge">{state?.totalQueueSize ?? 0}</span>
        </div>
        {!state || state.upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
            Keine weiteren Tracks in der Queue.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {state.upcoming.map((t, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 text-sm"
              >
                <span className="w-6 text-right text-xs tabular-nums text-ink-subtle">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-ink">{t.title}</div>
                  <div className="truncate text-[11px] text-ink-subtle">{t.author}</div>
                </div>
                <span className="text-xs tabular-nums text-ink-muted">
                  {formatMs(t.durationMs)}
                </span>
              </li>
            ))}
            {state.totalQueueSize > state.upcoming.length && (
              <li className="px-3 py-2 text-center text-xs text-ink-subtle">
                + {state.totalQueueSize - state.upcoming.length} weitere
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
