"use client";

import { useState, useTransition, type ReactNode } from "react";
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

const MESSAGE_PRESETS = [
  { label: "Standard", text: "🎉 {user} ist auf **Level {level}** aufgestiegen!" },
  { label: "Kurz", text: "{user} → Level **{level}** 🆙" },
  { label: "Glückwunsch", text: "🎊 Glückwunsch {user}, du bist jetzt **Level {level}** auf {server}!" },
  { label: "Spielerisch", text: "⚡ {username} hat **Level {level}** freigeschaltet! 🏆" },
  { label: "Minimal", text: "{user} 💫 Lvl {level}" },
];

const PLACEHOLDERS = ["{user}", "{username}", "{level}", "{server}"];

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

  const [enabled, setEnabled] = useState(initial.levelingEnabled);
  const [levelUpChannelId, setLevelUpChannelId] = useState(initial.levelUpChannelId ?? "");

  const [msgMin, setMsgMin] = useState(initial.xpPerMessageMin);
  const [msgMax, setMsgMax] = useState(initial.xpPerMessageMax);
  const [cooldown, setCooldown] = useState(initial.xpCooldownSeconds);
  const [voiceXp, setVoiceXp] = useState(initial.xpPerMinuteVoice);
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
  const previewSum = preview.reduce((s, p) => s + p.xp, 0);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveLevelingSettings(formData);
      setFeedback(
        result.ok ? { kind: "ok", msg: "Gespeichert." } : { kind: "error", msg: result.error },
      );
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Master-Toggle als prominente Card */}
      <SubCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        }
        title="Leveling-System"
        description="Wenn aus, vergibt der Bot weder Message- noch Voice-XP."
        enabled={enabled}
        toggleName="levelingEnabled"
        onToggleChange={setEnabled}
        tone="amber"
      >
        {enabled && (
          <FormField
            label="Level-Up-Channel"
            hint="Wohin Level-Up-Nachrichten geschickt werden. Ohne Auswahl: der Channel der letzten Nachricht (Voice-Level-Ups werden dann unterdrückt)."
          >
            <ChannelPicker
              name="levelUpChannelId"
              defaultValue={initial.levelUpChannelId}
              value={levelUpChannelId}
              channels={channels}
              allowedTypes={[0, 5]}
              placeholder="Keinen — Nachricht im jeweiligen Channel"
              onChange={setLevelUpChannelId}
            />
          </FormField>
        )}
      </SubCard>

      <div className={enabled ? "" : "pointer-events-none opacity-40"}>
        {/* XP-Quellen — Message + Voice */}
        <div className="mb-3 mt-4 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          XP-Quellen
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SubCard
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
            title="Message-XP"
            description="XP pro Nachricht (Random zwischen Min und Max)."
            tone="brand"
            staticActive
          >
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-bg-card/50 p-3">
              <Stepper label="Min" name="xpPerMessageMin" value={msgMin} min={1} max={500} onChange={setMsgMin} />
              <Stepper label="Max" name="xpPerMessageMax" value={msgMax} min={1} max={500} onChange={setMsgMax} />
              <Stepper label="Cooldown" suffix="Sek" name="xpCooldownSeconds" value={cooldown} min={0} max={600} onChange={setCooldown} />
            </div>
          </SubCard>

          <SubCard
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            }
            title="Voice-XP"
            description="XP pro Minute in einem Voice-Channel. 0 = aus."
            tone="purple"
            staticActive
          >
            <div className="rounded-xl border border-line bg-bg-card/50 p-3">
              <Stepper label="XP pro Minute" name="xpPerMinuteVoice" value={voiceXp} min={0} max={100} onChange={setVoiceXp} />
            </div>
          </SubCard>
        </div>

        {/* Level-Kurve */}
        <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Level-Kurve
        </div>
        <div className="rounded-2xl border border-line bg-bg-elevated/40 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Basis-XP (Level 1)" hint="Wie viel XP für das erste Level. Default: 100.">
              <input
                name="xpLevelBase"
                type="number"
                min={10}
                max={10000}
                value={base}
                onChange={(e) => setBase(Math.max(10, Math.min(10000, Number(e.target.value) || 100)))}
                className="input"
              />
            </FormField>
            <FormField label="Wachstum pro Level (%)" hint="0 = alle Level gleich · 15-25 = sanft · 50+ = brutal.">
              <input
                name="xpLevelMultiplier"
                type="number"
                min={0}
                max={100}
                value={mult}
                onChange={(e) => setMult(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="input"
              />
            </FormField>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-ink-subtle">
                Live-Vorschau · XP pro Level
              </span>
              <span className="text-ink-muted tabular-nums">
                Σ Level 1–10: {previewSum.toLocaleString("de-DE")} XP
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
              {preview.map((p, i) => {
                const intensity = (i + 1) / 10;
                return (
                  <div
                    key={p.level}
                    className="rounded-lg border border-line p-2 text-center"
                    style={{
                      background: `rgb(var(--accent-from) / ${0.05 + intensity * 0.15})`,
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-wide text-ink-subtle">
                      Lvl {p.level}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
                      {p.xp >= 1000 ? `${(p.xp / 1000).toFixed(1)}k` : p.xp}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Level-Up-Nachricht */}
        <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Level-Up-Nachricht
        </div>
        <div className="rounded-2xl border border-line bg-bg-elevated/40 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
              Vorlagen
            </span>
            {MESSAGE_PRESETS.map((p) => {
              const isActive = message.trim() === p.text.trim();
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setMessage(p.text)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? "border-brand/40 bg-brand-subtle text-brand"
                      : "border-line bg-bg-elevated text-ink-muted hover:bg-bg-hover hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <textarea
            name="levelUpMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={500}
            className="input min-h-[60px] resize-y w-full"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
              Platzhalter
            </span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMessage((m) => m + p)}
                title="Einfügen"
                className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted hover:bg-bg-hover hover:text-ink"
              >
                {p}
              </button>
            ))}
          </div>

          <MessagePreview
            text={previewText}
            botName={bot.name}
            botAvatarUrl={bot.avatarUrl}
            hint='Beispieldaten: User „Max", Level 5'
          />
        </div>
      </div>

      {/* Sticky Save-Bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border border-line bg-bg-card/95 px-5 py-3 shadow-card-lg backdrop-blur">
        <span className="text-xs text-ink-subtle">
          Änderungen werden nach „Speichern" übernommen.
        </span>
        <div className="flex items-center gap-3">
          {feedback && (
            <span
              className={`text-sm ${
                feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {feedback.msg}
            </span>
          )}
          <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
            {isPending ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>
    </form>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

function Stepper({
  label,
  name,
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
        {label}
      </label>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-bg-elevated">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="grid w-7 shrink-0 place-items-center text-ink-muted hover:bg-bg-hover hover:text-ink disabled:opacity-30"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <input
          name={name}
          type="number"
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
          }}
          min={min}
          max={max}
          className="min-w-0 flex-1 border-x border-line bg-transparent py-1.5 text-center text-sm font-semibold tabular-nums text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="grid w-7 shrink-0 place-items-center text-ink-muted hover:bg-bg-hover hover:text-ink disabled:opacity-30"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        {suffix && (
          <span className="grid shrink-0 place-items-center bg-bg-card px-2 text-[10px] font-medium uppercase text-ink-subtle">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

interface SubCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled?: boolean;
  toggleName?: string;
  onToggleChange?: (v: boolean) => void;
  tone: "amber" | "brand" | "purple";
  staticActive?: boolean; // wenn true, kein Toggle, immer als aktiv dargestellt
  children?: ReactNode;
}

function SubCard({
  icon,
  title,
  description,
  enabled,
  toggleName,
  onToggleChange,
  tone,
  staticActive,
  children,
}: SubCardProps) {
  const showActive = staticActive || enabled;
  const toneClass = showActive
    ? tone === "amber"
      ? "border-amber-500/30 bg-amber-500/[0.04]"
      : tone === "brand"
        ? "border-brand/30 bg-brand/[0.04]"
        : "border-purple-500/30 bg-purple-500/[0.04]"
    : "border-line bg-bg-elevated/40";
  const iconClass = showActive
    ? tone === "amber"
      ? "bg-amber-500/15 text-amber-400"
      : tone === "brand"
        ? "bg-brand/15 text-brand-light"
        : "bg-purple-500/15 text-purple-400"
    : "bg-zinc-500/10 text-zinc-500";

  return (
    <div className={`rounded-2xl border p-5 transition-colors ${toneClass}`}>
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
        {toggleName && (
          <>
            <input
              type="checkbox"
              name={toggleName}
              checked={enabled ?? false}
              onChange={(e) => onToggleChange?.(e.target.checked)}
              className="sr-only"
            />
            <span
              onClick={() => onToggleChange?.(!enabled)}
              className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-zinc-700 transition-colors"
              style={{ background: enabled ? "rgb(245 158 11)" : undefined }}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-4" : ""
                }`}
              />
            </span>
          </>
        )}
      </div>
      {children && (
        <div className="mt-4 border-t border-line/60 pt-4">{children}</div>
      )}
    </div>
  );
}
