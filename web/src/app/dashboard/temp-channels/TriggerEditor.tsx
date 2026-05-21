"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { addTrigger, removeTrigger } from "./actions";

export interface TriggerRow {
  channelId: string;
  channelName: string | null;
  userLimit: number;
  nameTemplate: string | null;
}

export function TriggerEditor({
  triggers,
  channels,
}: {
  triggers: TriggerRow[];
  channels: ChannelOption[];
}) {
  const router = useRouter();
  const [channelId, setChannelId] = useState("");
  const [limit, setLimit] = useState(2);
  const [template, setTemplate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | "add" | null>(null);
  const [isPending, startTransition] = useTransition();

  const onAdd = () => {
    if (!channelId.trim()) return;
    setError(null);
    setPendingId("add");
    const formData = new FormData();
    formData.set("channelId", channelId);
    formData.set("userLimit", String(limit));
    formData.set("nameTemplate", template);
    startTransition(async () => {
      const res = await addTrigger(formData);
      if (res.ok) {
        setChannelId("");
        setLimit(2);
        setTemplate("");
        router.refresh();
      } else {
        setError(res.error);
      }
      setPendingId(null);
    });
  };

  const onRemove = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      await removeTrigger(id);
      router.refresh();
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Liste */}
      {triggers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
          Noch keine Trigger angelegt. Lege einen unten an, z.B. „+2 Leute" mit Limit 2.
        </div>
      ) : (
        <ul className="space-y-2">
          {triggers.map((t) => (
            <li
              key={t.channelId}
              className={`flex items-center gap-3 rounded-xl border border-line bg-bg-elevated/40 p-3 transition-opacity ${pendingId === t.channelId ? "opacity-40" : ""}`}
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-card text-sm font-semibold text-brand">
                {t.userLimit > 0 ? `+${t.userLimit}` : "∞"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  #{t.channelName ?? "unbekannt"}
                </div>
                <div className="truncate font-mono text-[11px] text-ink-subtle">
                  {t.channelId}
                  {t.nameTemplate && (
                    <span className="ml-2 text-ink-muted">
                      · Template: {t.nameTemplate}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(t.channelId)}
                disabled={isPending}
                title="Trigger entfernen"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-rose-500/15 hover:text-rose-400"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add-Form */}
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/20 p-3 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Neuen Trigger anlegen
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_90px_1fr_auto]">
          <ChannelPicker
            value={channelId}
            onChange={(v) => setChannelId(v ?? "")}
            channels={channels}
            allowedTypes={[2]}
            placeholder="Voice-Channel wählen…"
          />
          <input
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            type="number"
            min={0}
            max={99}
            placeholder="Limit"
            className="input"
            title="0 = unbegrenzt"
          />
          <input
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            type="text"
            placeholder="Name-Override (optional)"
            className="input"
            maxLength={90}
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={isPending || !channelId.trim()}
            className="btn-primary shrink-0 disabled:opacity-60"
          >
            {pendingId === "add" ? "…" : "+ Add"}
          </button>
        </div>
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
            {error}
          </div>
        )}
        <p className="text-[11px] text-ink-subtle">
          Limit 0 = unbegrenzt. Template überschreibt den globalen Default — Platzhalter:{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono">{"{nick}"}</code>{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono">{"{user}"}</code>
        </p>
      </div>
    </div>
  );
}
