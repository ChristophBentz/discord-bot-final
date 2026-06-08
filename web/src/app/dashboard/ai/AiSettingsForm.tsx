"use client";

import { useState, useTransition } from "react";
import { saveAiSettings, testAiConnection, type AiSettings } from "./actions";

interface Channel {
  channelId: string;
  name: string;
  type: number;
}

interface Props {
  initial: AiSettings;
  channels: Channel[];
}

const TTS_VOICES = [
  { label: "Deutsch (M, freundlich)", value: "German_PlayfulMan" },
  { label: "Deutsch (F, ruhig)", value: "German_SweetLady" },
  { label: "Englisch (M, US)", value: "English_FriendlyMan" },
  { label: "Englisch (F, US)", value: "English_GraceLady" },
  { label: "Chinesisch (M)", value: "Chinese_Mandarin_Man" },
];

export function AiSettingsForm({ initial, channels }: Props) {
  const [form, setForm] = useState<AiSettings>(initial);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; imageUrl?: string } | null>(null);

  const update = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveAiSettings(form);
      if (res.ok) {
        setSavedAt(Date.now());
        setTimeout(() => setSavedAt(null), 2500);
      } else {
        setError(res.error ?? "Fehler beim Speichern");
      }
    });
  }

  function runTest() {
    setTestResult(null);
    setTesting(true);
    testAiConnection()
      .then((r) => {
        if (r.ok) {
          setTestResult({ ok: true, msg: "✓ Verbindung OK", imageUrl: r.imageUrl });
        } else {
          setTestResult({ ok: false, msg: r.error ?? "Fehler" });
        }
      })
      .finally(() => setTesting(false));
  }

  const textChannels = channels.filter((c) => c.type === 0);

  return (
    <div className="space-y-6">
      {/* Provider Card */}
      <Card>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          Provider
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          Geteilt zwischen allen AI-Features (Bild, Chat, TTS, Music, Video).
        </p>

        <div className="mt-4 space-y-4">
          <Field label="Anbieter">
            <select
              value={form.aiProvider}
              onChange={(e) => update("aiProvider", e.target.value)}
              className="input w-full"
            >
              <option value="minimax">MiniMax</option>
            </select>
          </Field>

          <Field label="API-Region">
            <select
              value={form.aiApiBaseUrl}
              onChange={(e) => update("aiApiBaseUrl", e.target.value)}
              className="input w-full"
            >
              <option value="https://api.minimaxi.com">International (api.minimaxi.com)</option>
              <option value="https://api.minimax.chat">Mainland China (api.minimax.chat)</option>
              <option value="https://api.minimax.io">Legacy (api.minimax.io)</option>
            </select>
          </Field>

          <Field label="API-Key">
            <div className="flex items-center gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={form.aiApiKey}
                onChange={(e) => update("aiApiKey", e.target.value)}
                placeholder="sk-api-…"
                className="input flex-1 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="rounded-md border border-line bg-bg-elevated px-3 py-2 text-xs text-ink-muted hover:text-ink"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          <Field label="Group-ID" hint="MiniMax Account → Basic Information.">
            <input
              type="text"
              value={form.aiGroupId}
              onChange={(e) => update("aiGroupId", e.target.value)}
              placeholder="(leer wenn nicht benötigt)"
              className="input w-full font-mono text-xs"
            />
          </Field>
        </div>
      </Card>

      {/* Image */}
      <FeatureSection
        title="Bild-Generierung"
        slashCmd="/image"
        icon="🖼️"
        enabled={form.aiEnabled}
        onToggle={(v) => update("aiEnabled", v)}
      >
        <Field label="Modell">
          <input
            type="text"
            value={form.aiImageModel}
            onChange={(e) => update("aiImageModel", e.target.value)}
            className="input w-full font-mono text-xs"
          />
        </Field>
        <ChannelField
          label="Erlaubter Channel"
          value={form.aiImageChannelId}
          onChange={(v) => update("aiImageChannelId", v)}
          channels={textChannels}
        />
        <LimitField
          value={form.aiImagesPerUserPerDay}
          onChange={(v) => update("aiImagesPerUserPerDay", v)}
        />
      </FeatureSection>

      {/* Chat */}
      <FeatureSection
        title="Chat / LLM"
        slashCmd="/chat"
        icon="💬"
        enabled={form.aiChatEnabled}
        onToggle={(v) => update("aiChatEnabled", v)}
      >
        <Field label="Modell">
          <input
            type="text"
            value={form.aiChatModel}
            onChange={(e) => update("aiChatModel", e.target.value)}
            className="input w-full font-mono text-xs"
          />
        </Field>
        <ChannelField
          label="Erlaubter Channel"
          value={form.aiChatChannelId}
          onChange={(v) => update("aiChatChannelId", v)}
          channels={textChannels}
        />
        <LimitField
          value={form.aiChatPerUserPerDay}
          onChange={(v) => update("aiChatPerUserPerDay", v)}
        />
      </FeatureSection>

      {/* TTS */}
      <FeatureSection
        title="Text-to-Speech"
        slashCmd="/tts"
        icon="🎙️"
        enabled={form.aiTtsEnabled}
        onToggle={(v) => update("aiTtsEnabled", v)}
      >
        <Field label="Modell">
          <input
            type="text"
            value={form.aiTtsModel}
            onChange={(e) => update("aiTtsModel", e.target.value)}
            className="input w-full font-mono text-xs"
          />
        </Field>
        <Field label="Standard-Stimme">
          <select
            value={form.aiTtsVoiceId}
            onChange={(e) => update("aiTtsVoiceId", e.target.value)}
            className="input w-full"
          >
            {TTS_VOICES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <ChannelField
          label="Erlaubter Channel"
          value={form.aiTtsChannelId}
          onChange={(v) => update("aiTtsChannelId", v)}
          channels={textChannels}
        />
        <LimitField
          value={form.aiTtsPerUserPerDay}
          onChange={(v) => update("aiTtsPerUserPerDay", v)}
        />
      </FeatureSection>

      {/* Music */}
      <FeatureSection
        title="Musik"
        slashCmd="/music"
        icon="🎵"
        enabled={form.aiMusicEnabled}
        onToggle={(v) => update("aiMusicEnabled", v)}
      >
        <Field label="Modell">
          <input
            type="text"
            value={form.aiMusicModel}
            onChange={(e) => update("aiMusicModel", e.target.value)}
            className="input w-full font-mono text-xs"
          />
        </Field>
        <ChannelField
          label="Erlaubter Channel"
          value={form.aiMusicChannelId}
          onChange={(v) => update("aiMusicChannelId", v)}
          channels={textChannels}
        />
        <LimitField
          value={form.aiMusicPerUserPerDay}
          onChange={(v) => update("aiMusicPerUserPerDay", v)}
        />
      </FeatureSection>

      {/* Video */}
      <FeatureSection
        title="Video"
        slashCmd="/video"
        icon="🎬"
        enabled={form.aiVideoEnabled}
        onToggle={(v) => update("aiVideoEnabled", v)}
        hint="Async — 1-3 Min Wartezeit, ~$0.50/Video. Setze Limit niedrig."
      >
        <Field label="Modell">
          <input
            type="text"
            value={form.aiVideoModel}
            onChange={(e) => update("aiVideoModel", e.target.value)}
            className="input w-full font-mono text-xs"
          />
        </Field>
        <ChannelField
          label="Erlaubter Channel"
          value={form.aiVideoChannelId}
          onChange={(v) => update("aiVideoChannelId", v)}
          channels={textChannels}
        />
        <LimitField
          value={form.aiVideoPerUserPerDay}
          onChange={(v) => update("aiVideoPerUserPerDay", v)}
        />
      </FeatureSection>

      {/* Test Result */}
      {testResult && (
        <div
          className={`rounded-md border p-3 text-xs ${
            testResult.ok
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/5 text-rose-200"
          }`}
        >
          <div className="font-medium">{testResult.msg}</div>
          {testResult.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={testResult.imageUrl} alt="" className="mt-2 max-h-32 rounded" />
          )}
        </div>
      )}

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 -mx-6 border-t border-line bg-bg-base/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={runTest}
            disabled={testing || !form.aiApiKey}
            className="rounded-md border border-line bg-bg-elevated px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-50"
          >
            {testing ? "Teste…" : "Verbindung testen"}
          </button>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-rose-400">{error}</span>}
            {savedAt && <span className="text-xs text-emerald-400">✓ Gespeichert</span>}
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-bg-base hover:bg-white disabled:opacity-50"
            >
              {pending ? "Speichere…" : "Speichern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-lg border border-line bg-bg-card p-5">{children}</section>;
}

function FeatureSection({
  title,
  slashCmd,
  icon,
  enabled,
  onToggle,
  hint,
  children,
}: {
  title: string;
  slashCmd: string;
  icon: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border bg-bg-card transition-colors ${
        enabled ? "border-line" : "border-line/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="text-xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
              {slashCmd}
            </code>
          </div>
          {hint && <p className="mt-0.5 text-[11px] text-ink-subtle">{hint}</p>}
        </div>
        <Switch checked={enabled} onChange={onToggle} />
      </div>

      {/* Body — nur sichtbar wenn enabled */}
      {enabled && (
        <div className="space-y-4 border-t border-line px-5 py-4">{children}</div>
      )}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}

function ChannelField({
  label,
  value,
  onChange,
  channels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  channels: Channel[];
}) {
  return (
    <Field label={label} hint="Leer = alle Channels erlaubt.">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full"
      >
        <option value="">— Alle Channels —</option>
        {channels.map((c) => (
          <option key={c.channelId} value={c.channelId}>
            #{c.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function LimitField({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label="Limit pro User pro 24h">
      <input
        type="number"
        min={0}
        max={1000}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="input w-32 text-sm tabular-nums"
      />
    </Field>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-emerald-500" : "bg-bg-elevated"
      }`}
    >
      <span
        className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
