"use client";

import { useState, useTransition } from "react";
import { approveAppeal, denyAppeal, deleteAppeal } from "./actions";

export interface AppealEntry {
  id: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  banReason: string | null;
  text: string;
  status: string; // pending | approved | denied
  decidedBy: string | null;
  decisionNote: string | null;
  inviteUrl: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Offen", cls: "bg-amber-500/15 text-amber-300" },
  approved: { label: "Angenommen", cls: "bg-emerald-500/15 text-emerald-300" },
  denied: { label: "Abgelehnt", cls: "bg-rose-500/15 text-rose-300" },
};

export function AppealsList({ items }: { items: AppealEntry[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: number; mode: "approve" | "deny" } | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const decide = (id: number, mode: "approve" | "deny", decisionNote: string) => {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res =
        mode === "approve" ? await approveAppeal(id, decisionNote) : await denyAppeal(id, decisionNote);
      if (!res.ok) setError(res.error);
      setPendingId(null);
      setNoteFor(null);
      setNote("");
    });
  };

  const remove = (id: number) => {
    if (!confirm("Antrag löschen? Der User kann danach einen neuen Antrag stellen.")) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await deleteAppeal(id);
      if (!res.ok) setError(res.error);
      setPendingId(null);
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
        Keine Entbannungsanträge.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}
      {items.map((a) => {
        const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.pending!;
        return (
          <div
            key={a.id}
            className={`rounded-xl border border-line bg-bg-elevated/40 p-4 transition-opacity ${pendingId === a.id ? "opacity-40" : ""}`}
          >
            <div className="flex items-center gap-3">
              {a.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-line" />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-gradient text-sm font-semibold text-white">
                  {a.username[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.username}</div>
                <div className="truncate font-mono text-[11px] text-ink-subtle">{a.userId}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
              <span className="hidden text-xs text-ink-subtle sm:block">
                {new Date(a.createdAt).toLocaleDateString("de-DE")}
              </span>
            </div>

            {a.banReason && (
              <p className="mt-3 text-xs text-ink-subtle">
                <span className="font-semibold text-ink-muted">Ban-Grund:</span> {a.banReason}
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-bg-card/60 p-3 text-sm text-ink">
              {a.text}
            </p>

            {a.status !== "pending" && (
              <p className="mt-2 text-xs text-ink-subtle">
                Entschieden von {a.decidedBy ?? "—"}
                {a.decisionNote ? ` · „${a.decisionNote}"` : ""}
                {a.inviteUrl && (
                  <>
                    {" · "}
                    <a
                      href={a.inviteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      Rejoin-Invite
                    </a>
                  </>
                )}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {a.status === "pending" && noteFor?.id !== a.id && (
                <>
                  <button
                    type="button"
                    onClick={() => setNoteFor({ id: a.id, mode: "approve" })}
                    disabled={isPending}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    Annehmen &amp; entbannen
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteFor({ id: a.id, mode: "deny" })}
                    disabled={isPending}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    Ablehnen
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => remove(a.id)}
                disabled={isPending}
                className="rounded-lg border border-line bg-bg-card px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-rose-400 disabled:opacity-50"
              >
                Löschen
              </button>
            </div>

            {noteFor?.id === a.id && (
              <div className="mt-3 space-y-2 rounded-lg border border-line bg-bg-card/60 p-3">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  placeholder="Optionale Anmerkung — der User sieht sie auf der Appeal-Seite"
                  className="w-full rounded-lg border border-line bg-bg-elevated/50 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => decide(a.id, noteFor.mode, note)}
                    disabled={isPending}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                      noteFor.mode === "approve"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {noteFor.mode === "approve" ? "Bestätigen: annehmen & entbannen" : "Bestätigen: ablehnen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNoteFor(null);
                      setNote("");
                    }}
                    disabled={isPending}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-muted"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
