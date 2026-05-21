"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { saveLevelingSettings } from "./actions";

interface Initial {
  levelingEnabled: boolean;
  levelUpChannelId: string | null;
  xpPerMessageMin: number;
  xpPerMessageMax: number;
  xpCooldownSeconds: number;
  xpPerMinuteVoice: number;
}

function NumberField({
  name,
  label,
  defaultValue,
  hint,
  min = 0,
}: {
  name: string;
  label: string;
  defaultValue: number;
  hint?: string;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        defaultValue={defaultValue}
        className="input"
      />
      {hint && <span className="mt-1.5 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

export function LevelingForm({
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
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveLevelingSettings(formData);
      if (result.ok) {
        setFeedback({ kind: "ok", msg: "Gespeichert." });
      } else {
        setFeedback({ kind: "error", msg: result.error });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="levelingEnabled"
          label="Leveling aktiv"
          description="Wenn aus, vergibt der Bot weder Message- noch Voice-XP."
          defaultChecked={initial.levelingEnabled}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Level-Up-Channel</label>
        <ChannelPicker
          name="levelUpChannelId"
          defaultValue={initial.levelUpChannelId}
          channels={channels}
          allowedTypes={[0, 5]}
          placeholder="Keinen — Nachricht im jeweiligen Channel"
        />
        <p className="mt-1.5 text-xs text-ink-subtle">
          Wohin Level-Up-Nachrichten geschickt werden. Ohne Auswahl: der Channel, in dem die letzte Nachricht kam (Voice-Level-Ups werden dann unterdrückt).
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Message-XP
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField name="xpPerMessageMin" label="Min XP" defaultValue={initial.xpPerMessageMin} />
          <NumberField name="xpPerMessageMax" label="Max XP" defaultValue={initial.xpPerMessageMax} />
          <NumberField name="xpCooldownSeconds" label="Cooldown (Sek.)" defaultValue={initial.xpCooldownSeconds} hint="Anti-Spam" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Voice-XP
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField name="xpPerMinuteVoice" label="XP pro Minute" defaultValue={initial.xpPerMinuteVoice} hint="0 = keine Voice-XP" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
          {isPending ? "Speichere…" : "Speichern"}
        </button>
        {feedback && (
          <span className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  );
}
