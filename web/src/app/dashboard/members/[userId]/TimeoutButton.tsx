"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { timeoutMember } from "./moderationActions";
import { ProtectedStub } from "./ProtectedStub";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PRESETS: Array<{ label: string; seconds: number }> = [
  { label: "5 min", seconds: 5 * 60 },
  { label: "10 min", seconds: 10 * 60 },
  { label: "1 h", seconds: 60 * 60 },
  { label: "1 Tag", seconds: 24 * 60 * 60 },
  { label: "1 Woche", seconds: 7 * 24 * 60 * 60 },
  { label: "28 Tage", seconds: 28 * 24 * 60 * 60 },
];

export function TimeoutButton({
  userId,
  userName,
  protected: isProtected = false,
}: {
  userId: string;
  userName: string;
  protected?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(60 * 60); // 1h default
  const [error, setError] = useState<string | null>(null);
  const [dmInfo, setDmInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setReason("");
    setDuration(60 * 60);
    setError(null);
    setDmInfo(null);
  };

  const onClose = () => {
    if (isPending) return;
    setOpen(false);
    setTimeout(reset, 200);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setDmInfo(null);
    startTransition(async () => {
      const res = await timeoutMember(userId, reason, duration);
      if (!res.ok) {
        setError(res.error);
      } else if (res.dmSent) {
        setOpen(false);
        setTimeout(reset, 200);
      } else {
        setDmInfo(res.dmError ?? "DM konnte nicht zugestellt werden");
      }
    });
  };

  if (isProtected) {
    return (
      <ProtectedStub
        label="Timeout"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        }
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg-elevated/80 px-3.5 py-2 text-sm font-medium text-ink-muted backdrop-blur transition-colors hover:border-orange-500/30 hover:bg-bg-hover hover:text-orange-400"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        Timeout
      </button>

      <Modal open={open} onClose={onClose} title={`${userName} stummschalten`}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Dauer</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  type="button"
                  onClick={() => setDuration(p.seconds)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    duration === p.seconds
                      ? "bg-brand-gradient text-white shadow-glow"
                      : "border border-line bg-bg-elevated text-ink-muted hover:bg-bg-hover hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="timeout-reason" className="mb-1.5 block text-sm font-medium text-ink">
              Grund
            </label>
            <textarea
              id="timeout-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Warum wird stummgeschaltet?"
              maxLength={500}
              autoFocus
              required
              className="input resize-none"
            />
            <div className="mt-1.5 text-right text-xs text-ink-subtle">
              {reason.length} / 500
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {error}
            </div>
          )}
          {dmInfo && (
            <div className="space-y-2">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                ✅ Timeout gesetzt und im Log gepostet.
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                ⚠️ DM nicht zustellbar: {dmInfo}
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={onClose} className="btn-secondary">Schließen</button>
              </div>
            </div>
          )}

          {!dmInfo && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} disabled={isPending} className="btn-secondary">
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isPending || !reason.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Setze…" : "Timeout setzen"}
              </button>
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
