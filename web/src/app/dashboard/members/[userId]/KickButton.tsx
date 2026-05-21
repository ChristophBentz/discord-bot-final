"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { kickMember } from "./moderationActions";
import { ProtectedStub } from "./ProtectedStub";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function KickButton({
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
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dmInfo, setDmInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setReason("");
    setConfirm(false);
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
      const res = await kickMember(userId, reason);
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
        label="Kicken"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}>
            <circle cx="12" cy="12" r="9" />
            <path d="m5 5 14 14" />
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
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg-elevated/80 px-3.5 py-2 text-sm font-medium text-ink-muted backdrop-blur transition-colors hover:border-rose-500/30 hover:bg-bg-hover hover:text-rose-400"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><circle cx="12" cy="12" r="9" /><path d="m5 5 14 14" /></svg>
        Kicken
      </button>

      <Modal open={open} onClose={onClose} title={`${userName} kicken`}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="kick-reason" className="mb-1.5 block text-sm font-medium text-ink">
              Grund
            </label>
            <textarea
              id="kick-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Warum wird gekickt?"
              maxLength={500}
              autoFocus
              required
              className="input resize-none"
            />
            <div className="mt-1.5 flex items-center justify-between text-xs text-ink-subtle">
              <span>User wird vom Server geworfen, kann aber mit Invite wiederkommen.</span>
              <span>{reason.length} / 500</span>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line bg-bg-elevated text-rose-500 focus:ring-rose-500/40"
            />
            <span>
              Ich verstehe, dass <strong className="text-ink">{userName}</strong> sofort den
              Server verlässt.
            </span>
          </label>

          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {error}
            </div>
          )}
          {dmInfo && (
            <div className="space-y-2">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                ✅ Gekickt und im Log gepostet.
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
                disabled={isPending || !reason.trim() || !confirm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(244,63,94,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Kicke…" : "Kicken"}
              </button>
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
