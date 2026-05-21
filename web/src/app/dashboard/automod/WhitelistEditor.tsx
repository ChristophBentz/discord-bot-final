"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWhitelistedInvite, removeWhitelistedInvite } from "./actions";

export interface InviteRow {
  id: number;
  guildId: string;
  guildName: string | null;
  note: string | null;
}

export function WhitelistEditor({ invites }: { invites: InviteRow[] }) {
  const router = useRouter();
  const [invite, setInvite] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | "add" | null>(null);
  const [isPending, startTransition] = useTransition();

  const onAdd = () => {
    if (!invite.trim()) return;
    setError(null);
    setPendingId("add");
    const formData = new FormData();
    formData.set("invite", invite);
    formData.set("note", note);
    startTransition(async () => {
      const res = await addWhitelistedInvite(formData);
      if (res.ok) {
        setInvite("");
        setNote("");
        router.refresh();
      } else {
        setError(res.error);
      }
      setPendingId(null);
    });
  };

  const onRemove = (id: number) => {
    setPendingId(id);
    startTransition(async () => {
      await removeWhitelistedInvite(id);
      router.refresh();
      setPendingId(null);
    });
  };

  return (
    <div className="pb-4 pt-2 space-y-3">
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            type="text"
            placeholder="discord.gg/xxxxx   oder   Server-ID"
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAdd();
              }
            }}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            type="text"
            placeholder="Notiz (optional)"
            className="input sm:w-48"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={isPending || !invite.trim()}
            className="btn-primary shrink-0 disabled:opacity-60"
          >
            {pendingId === "add" ? "…" : "+ Hinzufügen"}
          </button>
        </div>
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
            {error}
          </div>
        )}
      </div>

      {invites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-4 text-center text-xs text-ink-muted">
          Whitelist ist leer. Wenn der Toggle an ist, werden alle Invites gelöscht.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {invites.map((inv) => (
            <li
              key={inv.id}
              className={`flex items-center gap-3 rounded-lg border border-line bg-bg-card px-3 py-2 text-sm transition-opacity ${pendingId === inv.id ? "opacity-40" : ""}`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-ink">
                  {inv.guildName ?? "Unbekannter Server"}
                </span>
                <span className="truncate font-mono text-[11px] text-ink-subtle">{inv.guildId}</span>
              </div>
              {inv.note && (
                <span className="text-xs text-ink-muted">— {inv.note}</span>
              )}
              <button
                type="button"
                onClick={() => onRemove(inv.id)}
                disabled={isPending}
                title="Entfernen"
                className="ml-auto grid h-6 w-6 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-rose-500/15 hover:text-rose-400"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
