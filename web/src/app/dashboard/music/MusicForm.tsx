"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
import { saveMusicSettings } from "./actions";

interface Initial {
  musicEnabled: boolean;
}

export function MusicForm({ initial }: { initial: Initial }) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveMusicSettings(formData);
      setFeedback(
        res.ok ? { kind: "ok", msg: "Gespeichert." } : { kind: "error", msg: res.error },
      );
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="musicEnabled"
          label="Music aktiv"
          description="Bot spielt Musik aus YouTube/Spotify/SoundCloud in Voice-Channels."
          defaultChecked={initial.musicEnabled}
        />
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
