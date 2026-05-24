"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { saveNotifySettings } from "./actions";

interface Initial {
  achievementNotifyDM: boolean;
  achievementNotifyChannel: boolean;
  achievementChannelId: string | null;
}

export function NotifySettingsForm({
  initial,
  channels,
}: {
  initial: Initial;
  channels: ChannelOption[];
}) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [dmOn, setDmOn] = useState(initial.achievementNotifyDM);
  const [channelOn, setChannelOn] = useState(initial.achievementNotifyChannel);
  const [channelId, setChannelId] = useState(initial.achievementChannelId ?? "");

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveNotifySettings(formData);
      setFeedback(res.ok ? { kind: "ok", msg: "Gespeichert." } : { kind: "error", msg: res.error });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NotifyCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
          title="DM an User"
          description="Bot schickt dem User eine private Nachricht mit dem Embed."
          enabled={dmOn}
          toggleName="achievementNotifyDM"
          onToggleChange={setDmOn}
          tone="brand"
        />
        <NotifyCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          }
          title="In Channel posten"
          description="Achievement-Embed in den Channel unten posten."
          enabled={channelOn}
          toggleName="achievementNotifyChannel"
          onToggleChange={setChannelOn}
          tone="amber"
        />
      </div>

      {channelOn && (
        <div className="rounded-2xl border border-line bg-bg-elevated/40 p-5">
          <label className="mb-1.5 block text-sm font-medium text-ink">Achievement-Channel</label>
          <ChannelPicker
            name="achievementChannelId"
            defaultValue={initial.achievementChannelId}
            value={channelId}
            channels={channels}
            allowedTypes={[0, 5]}
            placeholder="— Channel wählen —"
            onChange={setChannelId}
          />
          <p className="mt-1.5 text-xs text-ink-subtle">
            Hier wird der Achievement-Post veröffentlicht.
          </p>
        </div>
      )}
      {!channelOn && (
        <input type="hidden" name="achievementChannelId" value={channelId} />
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
          {isPending ? "Speichere…" : "Speichern"}
        </button>
        {feedback && (
          <span
            className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}
          >
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  );
}

function NotifyCard({
  icon,
  title,
  description,
  enabled,
  toggleName,
  onToggleChange,
  tone,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  toggleName: string;
  onToggleChange: (v: boolean) => void;
  tone: "brand" | "amber";
}) {
  const toneClass = enabled
    ? tone === "brand"
      ? "border-brand/30 bg-brand/[0.04]"
      : "border-amber-500/30 bg-amber-500/[0.04]"
    : "border-line bg-bg-elevated/40";
  const iconClass = enabled
    ? tone === "brand"
      ? "bg-brand/15 text-brand-light"
      : "bg-amber-500/15 text-amber-400"
    : "bg-zinc-500/10 text-zinc-500";
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconClass}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">{title}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{description}</div>
          </div>
        </div>
        <input
          type="checkbox"
          name={toggleName}
          checked={enabled}
          onChange={(e) => onToggleChange(e.target.checked)}
          className="sr-only"
        />
        <span
          onClick={() => onToggleChange(!enabled)}
          className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-zinc-700 transition-colors"
          style={{ background: enabled ? (tone === "brand" ? "rgb(168 85 247)" : "rgb(245 158 11)") : undefined }}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-4" : ""
            }`}
          />
        </span>
      </div>
    </div>
  );
}
