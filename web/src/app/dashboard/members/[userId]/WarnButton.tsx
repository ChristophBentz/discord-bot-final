"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { warnMember } from "./warnActions";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

interface SuccessInfo {
  dmSent: boolean;
  dmError?: string;
}

export function WarnButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setReason("");
    setError(null);
    setSuccess(null);
  };

  const onClose = () => {
    if (isPending) return;
    setOpen(false);
    setTimeout(reset, 200);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await warnMember(userId, reason);
      if (res.ok) {
        if (res.dmSent) {
          // Alles glatt — Modal schließen
          setOpen(false);
          setTimeout(reset, 200);
        } else {
          // Warn gespeichert, aber DM fehlgeschlagen → Modal offen, Status zeigen
          setSuccess({ dmSent: false, dmError: res.dmError });
        }
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg-elevated/80 px-3.5 py-2 text-sm font-medium text-ink-muted backdrop-blur transition-colors hover:border-amber-500/30 hover:bg-bg-hover hover:text-amber-400"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><path d="M12 4 2 21h20L12 4Z" /><path d="M12 10v5" /><circle cx="12" cy="18" r="0.5" fill="currentColor" /></svg>
        Verwarnen
      </button>

      <Modal open={open} onClose={onClose} title={`${userName} verwarnen`}>
        {success ? (
          // Erfolg-State (nur sichtbar wenn DM fehlgeschlagen — bei DM-OK schließt sich Modal automatisch)
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              ✅ Verwarnung wurde in der Mod-History gespeichert und im Log-Channel gepostet.
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              ⚠️ Aber: <strong>{success.dmError ?? "DM konnte nicht zugestellt werden"}</strong>. Der User hat die Verwarnung nicht direkt erhalten.
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Schließen
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="warn-reason"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Grund
              </label>
              <textarea
                id="warn-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Warum wird verwarnt?"
                maxLength={500}
                autoFocus
                required
                className="input resize-none"
              />
              <div className="mt-1.5 flex items-center justify-between text-xs text-ink-subtle">
                <span>
                  Wird gespeichert, im Log-Channel gepostet und dem User per DM zugeschickt.
                </span>
                <span>{reason.length} / 500</span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isPending || !reason.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(250,176,26,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Verwarne…" : "Verwarnen"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
