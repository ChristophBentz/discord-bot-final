"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { MessagePreview } from "@/components/MessagePreview";
import { saveLevelingSettings } from "./actions";

interface Initial {
  levelingEnabled: boolean;
  levelUpChannelId: string | null;
  xpPerMessageMin: number;
  xpPerMessageMax: number;
  xpCooldownSeconds: number;
  xpPerMinuteVoice: number;
  xpLevelBase: number;
  xpLevelMultiplier: number;
  levelUpMessage: string;
}

interface BotIdentity {
  name: string;
  avatarUrl: string | null;
}

const MESSAGE_PRESETS: { label: string; text: string }[] = [
  { label: "Standard", text: "🎉 {user} ist auf **Level {level}** aufgestiegen!" },
  { label: "Kurz", text: "{user} → Level **{level}** 🆙" },
  { label: "Glückwunsch", text: "🎊 Glückwunsch {user}, du bist jetzt **Level {level}** auf {server}!" },
  { label: "Spielerisch", text: "⚡ {username} hat **Level {level}** freigeschaltet! 🏆" },
  { label: "Minimalistisch", text: "{user} 💫 Lvl {level}" },
];

// Renderfunktion — gleich wie im Bot, für die Vorschau
function renderPreview(
  template: string,
  args: { username: string; level: number; serverName: string },
): string {
  return template
    .replaceAll("{user}", `@${args.username}`)
    .replaceAll("{username}", args.username)
    .replaceAll("{level}", String(args.level))
    .replaceAll("{server}", args.serverName);
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
  bot,
}: {
  initial: Initial;
  channels: ChannelOption[];
  bot: BotIdentity;
}) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Live-Preview der Level-Kurve (controlled inputs für Base + Multiplier)
  const [base, setBase] = useState(initial.xpLevelBase);
  const [mult, setMult] = useState(initial.xpLevelMultiplier);
  const [message, setMessage] = useState(initial.levelUpMessage);
  const previewText = renderPreview(message, {
    username: "Max",
    level: 5,
    serverName: "Mein Server",
  });
  const preview = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    xp: Math.round(base * Math.pow(1 + mult / 100, i)),
  }));
  const previewMax = preview.reduce((s, p) => s + p.xp, 0);

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

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Level-Kurve
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Basis-XP (Level 1)</span>
            <input
              name="xpLevelBase"
              type="number"
              min={10}
              max={10000}
              value={base}
              onChange={(e) => setBase(Math.max(10, Math.min(10000, Number(e.target.value) || 100)))}
              className="input"
            />
            <span className="mt-1.5 block text-xs text-ink-subtle">
              Wie viel XP für das erste Level. Default: 100.
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Wachstum pro Level (%)
            </span>
            <input
              name="xpLevelMultiplier"
              type="number"
              min={0}
              max={100}
              value={mult}
              onChange={(e) => setMult(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="input"
            />
            <span className="mt-1.5 block text-xs text-ink-subtle">
              Wie viel mehr XP jedes nächste Level kostet. 0 = jedes Level gleich. 15-25 = sanft. 50+ = brutal.
            </span>
          </label>
        </div>

        {/* Live-Preview */}
        <div className="mt-4 rounded-2xl border border-line bg-bg-elevated/40 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wide text-ink-subtle">
              Vorschau: XP pro Level
            </span>
            <span className="text-ink-muted tabular-nums">
              Σ Level 1-10: {previewMax.toLocaleString("de-DE")} XP
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {preview.map((p) => (
              <div
                key={p.level}
                className="rounded-lg border border-line bg-bg-elevated/60 p-2 text-center"
              >
                <div className="text-[10px] uppercase tracking-wide text-ink-subtle">
                  Lvl {p.level}
                </div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
                  {p.xp >= 1000 ? `${(p.xp / 1000).toFixed(1)}k` : p.xp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Level-Up-Nachricht
        </h3>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {MESSAGE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setMessage(p.text)}
              className="rounded-lg border border-line bg-bg-elevated/60 px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-brand/40 hover:bg-bg-hover hover:text-ink"
            >
              {p.label}
            </button>
          ))}
        </div>

        <textarea
          name="levelUpMessage"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={500}
          className="input min-h-[60px] resize-y w-full"
        />

        <p className="mt-1.5 text-xs text-ink-subtle">
          Platzhalter:{" "}
          <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px]">{"{user}"}</code>{" "}
          = Mention,{" "}
          <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px]">{"{username}"}</code>{" "}
          = Name,{" "}
          <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px]">{"{level}"}</code>{" "}
          = neues Level,{" "}
          <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px]">{"{server}"}</code>{" "}
          = Server-Name. Discord-Markdown wird gerendert (**fett**, *kursiv*, `code`).
        </p>

        <div className="mt-3">
          <MessagePreview
            text={previewText}
            botName={bot.name}
            botAvatarUrl={bot.avatarUrl}
            hint='Beispieldaten: User „Max", Level 5'
          />
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
