"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { awardAchievement } from "./achievementActions";

export interface UnlockedAchievement {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  awardedAt: string;
}

export interface AvailableAchievement {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  triggerType: string;
}

interface Props {
  userId: string;
  unlocked: UnlockedAchievement[];
  available: AvailableAchievement[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function AchievementsPanel({ userId, unlocked, available }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const award = (id: number) => {
    setError(null);
    setInfo(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await awardAchievement(userId, id);
      if (!res.ok) {
        setError(res.error);
      } else if (res.alreadyAwarded) {
        setError("User hat dieses Achievement bereits.");
      } else {
        const bits: string[] = ["Vergeben"];
        if (res.dmSent) bits.push("DM zugestellt");
        if (res.channelSent) bits.push("im Channel gepostet");
        setInfo(bits.join(" · "));
        setTimeout(() => {
          setOpen(false);
          setInfo(null);
        }, 1500);
      }
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-3">
      {unlocked.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
          Noch keine Achievements freigeschaltet.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {unlocked.map((a) => (
            <li
              key={a.id}
              title={`${a.description}\nErhalten: ${formatDate(a.awardedAt)}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-bg-elevated/40 p-2.5"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg-card">
                {a.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.imageUrl} alt={a.name} className="h-full w-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="text-[11px] text-ink-subtle">{formatDate(a.awardedAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => {
          setError(null);
          setInfo(null);
          setOpen(true);
        }}
        className="btn-secondary w-full"
        disabled={available.length === 0}
      >
        {available.length === 0
          ? "Keine Achievements zur Vergabe verfügbar"
          : "+ Achievement vergeben"}
      </button>

      <Modal open={open} onClose={() => !isPending && setOpen(false)} title="Achievement vergeben">
        <div className="space-y-3">
          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              {info}
            </div>
          )}
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {available.map((a) => {
              const isThisPending = pendingId === a.id;
              return (
                <li
                  key={a.id}
                  className={`flex items-center gap-3 rounded-xl border border-line bg-bg-elevated/40 p-3 transition-opacity ${isThisPending ? "opacity-40" : ""}`}
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg-card">
                    {a.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.imageUrl} alt={a.name} className="h-full w-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                    <div className="line-clamp-2 text-xs text-ink-muted">{a.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => award(a.id)}
                    disabled={isPending}
                    className="btn-primary shrink-0 disabled:opacity-50"
                  >
                    Vergeben
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
