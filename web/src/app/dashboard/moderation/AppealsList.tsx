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

interface UserGroup {
  userId: string;
  appeals: AppealEntry[]; // neuester zuerst
}

export function AppealsList({ items }: { items: AppealEntry[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: number; mode: "approve" | "deny" } | null>(null);
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Eine Karte pro User — items kommen bereits nach Datum absteigend sortiert.
  const groups: UserGroup[] = [];
  const byUser = new Map<string, UserGroup>();
  for (const a of items) {
    let group = byUser.get(a.userId);
    if (!group) {
      group = { userId: a.userId, appeals: [] };
      byUser.set(a.userId, group);
      groups.push(group);
    }
    group.appeals.push(a);
  }

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

  const remove = (id: number, hint: string) => {
    if (!confirm(hint)) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await deleteAppeal(id);
      if (!res.ok) setError(res.error);
      setPendingId(null);
    });
  };

  const toggleHistory = (userId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  if (groups.length === 0) {
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
      {groups.map((group) => {
        const latest = group.appeals[0]!;
        const older = group.appeals.slice(1);
        const badge = STATUS_BADGE[latest.status] ?? STATUS_BADGE.pending!;
        const isOpen = expanded.has(group.userId);
        return (
          <div
            key={group.userId}
            className={`rounded-xl border border-line bg-bg-elevated/40 p-4 transition-opacity ${pendingId === latest.id ? "opacity-40" : ""}`}
          >
            {/* Kopf: User + Status des neuesten Antrags */}
            <div className="flex items-center gap-3">
              {latest.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={latest.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-line" />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-gradient text-sm font-semibold text-white">
                  {latest.username[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{latest.username}</span>
                  {group.appeals.length > 1 && (
                    <span className="rounded-md bg-bg-card px-1.5 py-0.5 text-[10px] font-semibold text-ink-subtle">
                      {group.appeals.length}. Antrag
                    </span>
                  )}
                </div>
                <div className="truncate font-mono text-[11px] text-ink-subtle">{latest.userId}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
              <span className="hidden text-xs text-ink-subtle sm:block">
                {new Date(latest.createdAt).toLocaleDateString("de-DE")}
              </span>
            </div>

            {/* Neuester Antrag */}
            {latest.banReason && (
              <p className="mt-3 text-xs text-ink-subtle">
                <span className="font-semibold text-ink-muted">Ban-Grund:</span> {latest.banReason}
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-bg-card/60 p-3 text-sm text-ink">
              {latest.text}
            </p>

            {latest.status !== "pending" && (
              <p className="mt-2 text-xs text-ink-subtle">
                Entschieden von {latest.decidedBy ?? "—"}
                {latest.decisionNote ? ` · „${latest.decisionNote}"` : ""}
                {latest.inviteUrl && (
                  <>
                    {" · "}
                    <a href={latest.inviteUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                      Rejoin-Invite
                    </a>
                  </>
                )}
              </p>
            )}

            {/* Aktionen für den neuesten Antrag */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {latest.status === "pending" && noteFor?.id !== latest.id && (
                <>
                  <button
                    type="button"
                    onClick={() => setNoteFor({ id: latest.id, mode: "approve" })}
                    disabled={isPending}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    Annehmen &amp; entbannen
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteFor({ id: latest.id, mode: "deny" })}
                    disabled={isPending}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    Ablehnen
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() =>
                  remove(latest.id, "Antrag löschen? Der User kann danach einen neuen Antrag stellen.")
                }
                disabled={isPending}
                className="rounded-lg border border-line bg-bg-card px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-rose-400 disabled:opacity-50"
              >
                Löschen
              </button>
              {older.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleHistory(group.userId)}
                  className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-ink-subtle transition-colors hover:text-ink"
                >
                  {isOpen
                    ? "Frühere Anträge ausblenden"
                    : `Frühere Anträge anzeigen (${older.length})`}
                </button>
              )}
            </div>

            {/* Notiz-Eingabe für Entscheidung */}
            {noteFor?.id === latest.id && (
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
                    onClick={() => decide(latest.id, noteFor.mode, note)}
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

            {/* Frühere Anträge — kompakt */}
            {isOpen && older.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                {older.map((a) => {
                  const b = STATUS_BADGE[a.status] ?? STATUS_BADGE.pending!;
                  return (
                    <div
                      key={a.id}
                      className={`rounded-lg bg-bg-card/40 p-3 transition-opacity ${pendingId === a.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${b.cls}`}>{b.label}</span>
                        <span className="text-ink-subtle">
                          {new Date(a.createdAt).toLocaleDateString("de-DE")}
                        </span>
                        {a.decidedBy && <span className="text-ink-subtle">· von {a.decidedBy}</span>}
                        <button
                          type="button"
                          onClick={() => remove(a.id, "Diesen früheren Antrag endgültig löschen?")}
                          disabled={isPending}
                          className="ml-auto text-ink-subtle transition-colors hover:text-rose-400 disabled:opacity-50"
                        >
                          Löschen
                        </button>
                      </div>
                      <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-xs text-ink-muted">
                        {a.text}
                      </p>
                      {a.decisionNote && (
                        <p className="mt-1 text-[11px] text-ink-subtle">Anmerkung: „{a.decisionNote}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
