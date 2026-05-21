"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { addExcludedChannel, removeExcludedChannel } from "./actions";

export interface ExcludedChannelRow {
  channelId: string;
  name: string | null;
}

export function ExclusionEditor({
  channels,
  allChannels,
}: {
  channels: ExcludedChannelRow[];
  allChannels: ChannelOption[];
}) {
  const router = useRouter();
  const [channelId, setChannelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | "add" | null>(null);
  const [isPending, startTransition] = useTransition();

  const onAdd = () => {
    if (!channelId.trim()) return;
    setError(null);
    setPendingId("add");
    const formData = new FormData();
    formData.set("channelId", channelId);
    startTransition(async () => {
      const res = await addExcludedChannel(formData);
      if (res.ok) {
        setChannelId("");
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
      await removeExcludedChannel(id);
      router.refresh();
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <ChannelPicker
            name="channelId"
            value={channelId}
            onChange={setChannelId}
            channels={allChannels.filter(
              (c) => !channels.some((ex) => ex.channelId === c.channelId),
            )}
            allowedTypes={[0, 2, 5, 15]}
            placeholder="— Channel wählen —"
            allowClear={false}
          />
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={isPending || !channelId.trim()}
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

      {channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-4 text-center text-xs text-ink-muted">
          Keine Channels ausgenommen — AutoMod gilt überall.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {channels.map((c) => (
            <li
              key={c.channelId}
              className={`flex items-center gap-3 rounded-lg border border-line bg-bg-card px-3 py-2 text-sm transition-opacity ${pendingId === c.channelId ? "opacity-40" : ""}`}
            >
              <span className="text-ink">#{c.name ?? "unbekannt"}</span>
              <span className="font-mono text-[11px] text-ink-subtle">{c.channelId}</span>
              <button
                type="button"
                onClick={() => onRemove(c.channelId)}
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
