"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { banMember } from "./moderationActions";
import { ProtectedStub } from "./ProtectedStub";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const DELETE_OPTIONS = [
  { value: 0, label: "Keine" },
  { value: 1, label: "1 Tag" },
  { value: 3, label: "3 Tage" },
  { value: 7, label: "7 Tage" },
];

export function BanButton({
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
  const [deleteDays, setDeleteDays] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dmInfo, setDmInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setReason("");
    setDeleteDays(0);
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
      const res = await banMember(userId, reason, deleteDays);
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
        label="Bannen"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}>
            <circle cx="12" cy="12" r="9" />
            <path d="M4.93 4.93 19.07 19.07" />
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
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg-elevated/80 px-3.5 py-2 text-sm font-medium text-ink-muted backdrop-blur transition-colors hover:border-red-700/30 hover:bg-bg-hover hover:text-red-500"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M4.93 4.93 19.07 19.07" /></svg>
        Bannen
      </button>

      <Modal open={open} onClose={onClose} title={`${userName} bannen`}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="ban-reason" className="mb-1.5 block text-sm font-medium text-ink">
              Grund
            </label>
            <textarea
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Warum wird gebannt?"
              maxLength={500}
              autoFocus
              required
              className="input resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Nachrichten löschen
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DELETE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeleteDays(opt.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    deleteDays === opt.value
                      ? "bg-brand-gradient text-white shadow-glow"
                      : "border border-line bg-bg-elevated text-ink-muted hover:bg-bg-hover hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-subtle">
              Wie viele Tage Nachrichten von diesem User vor dem Ban gelöscht werden.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line bg-bg-elevated text-red-700 focus:ring-red-700/40"
            />
            <span>
              Ich verstehe, dass <strong className="text-ink">{userName}</strong> dauerhaft vom
              Server ausgeschlossen wird.
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
                ✅ Gebannt und im Log gepostet.
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(185,28,28,0.4)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Banne…" : "Bannen"}
              </button>
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
