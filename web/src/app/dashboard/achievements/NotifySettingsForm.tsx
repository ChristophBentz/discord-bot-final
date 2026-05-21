"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
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

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveNotifySettings(formData);
      if (res.ok) setFeedback({ kind: "ok", msg: "Gespeichert." });
      else setFeedback({ kind: "error", msg: res.error });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <div className="divide-y divide-line">
          <Toggle
            name="achievementNotifyDM"
            label="DM an User"
            description="Bot schickt dem User eine private Nachricht mit dem Achievement-Embed."
            defaultChecked={initial.achievementNotifyDM}
          />
          <Toggle
            name="achievementNotifyChannel"
            label="In Channel posten"
            description="Achievement-Embed wird in den unten gesetzten Channel gepostet."
            defaultChecked={initial.achievementNotifyChannel}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Achievement-Channel</label>
        <ChannelPicker
          name="achievementChannelId"
          defaultValue={initial.achievementChannelId}
          channels={channels}
          allowedTypes={[0, 5]}
          placeholder="— Channel wählen —"
        />
        <p className="mt-1.5 text-xs text-ink-subtle">
          Nur relevant, wenn „In Channel posten" aktiv ist.
        </p>
      </div>

      <div className="flex items-center gap-3">
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
