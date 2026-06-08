"use client";

import { useState, useTransition } from "react";
import { saveAiSettings, type AiSettings } from "./actions";

interface Channel {
  channelId: string;
  name: string;
  type: number;
}

interface Props {
  initial: AiSettings;
  channels: Channel[];
}

export function AiSettingsForm({ initial, channels }: Props) {
  const [form, setForm] = useState<AiSettings>(initial);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

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

  // Text-Channels filtern (Discord-Type 0)
  const textChannels = channels.filter((c) => c.type === 0);

  return (
    <div className="space-y-6">
      {/* Master-Toggle */}
      <Card>
        <SwitchRow
          label="AI-Features aktivieren"
          sub="Aktiviert den /image-Slash-Command im Discord."
          checked={form.aiEnabled}
          onChange={(v) => update("aiEnabled", v)}
        />
      </Card>

      <Card>
        <Section title="Provider" hint="Aktuell nur MiniMax verfügbar — weitere kommen.">
          <Field label="Anbieter">
            <select
              value={form.aiProvider}
              onChange={(e) => update("aiProvider", e.target.value)}
              className="input w-full"
            >
              <option value="minimax">MiniMax</option>
            </select>
          </Field>

          <Field label="API-Key" hint="Aus dem MiniMax Developer-Portal. Wird verschlüsselt auf dem Server gespeichert.">
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

          <Field label="Group-ID (optional)" hint="MiniMax-spezifisch. Nur nötig wenn dein Account das verlangt.">
            <input
              type="text"
              value={form.aiGroupId}
              onChange={(e) => update("aiGroupId", e.target.value)}
              placeholder="(leer lassen wenn unbekannt)"
              className="input w-full font-mono text-xs"
            />
          </Field>

          <Field label="Modell">
            <input
              type="text"
              value={form.aiImageModel}
              onChange={(e) => update("aiImageModel", e.target.value)}
              placeholder="image-01"
              className="input w-full font-mono text-xs"
            />
          </Field>
        </Section>
      </Card>

      <Card>
        <Section
          title="Channel"
          hint="In welchem Channel ist /image erlaubt? Leer = alle Channels."
        >
          <Field label="Erlaubter Channel">
            <select
              value={form.aiImageChannelId}
              onChange={(e) => update("aiImageChannelId", e.target.value)}
              className="input w-full"
            >
              <option value="">— Alle Channels —</option>
              {textChannels.map((c) => (
                <option key={c.channelId} value={c.channelId}>
                  #{c.name}
                </option>
              ))}
            </select>
          </Field>
        </Section>
      </Card>

      <Card>
        <Section title="Limits" hint="Schutz gegen Cost-Runaway.">
          <Field label="Bilder pro User pro 24h">
            <input
              type="number"
              min={0}
              max={1000}
              value={form.aiImagesPerUserPerDay}
              onChange={(e) => update("aiImagesPerUserPerDay", parseInt(e.target.value) || 0)}
              className="input w-32 text-sm tabular-nums"
            />
          </Field>
          <p className="text-xs text-ink-subtle">
            Tipp: Bei MiniMax kosten Bilder ~$0.01–0.02. Bei 5/User/Tag und 20 aktiven
            Usern = ~$30–60/Monat.
          </p>
        </Section>
      </Card>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 -mx-6 border-t border-line bg-bg-base/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-end gap-3">
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
  );
}

// ─── Bausteine ─────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-lg border border-line bg-bg-card p-5">{children}</section>;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          {title}
        </h3>
      </div>
      {hint && <p className="mb-4 text-xs text-ink-muted">{hint}</p>}
      <div className="space-y-4">{children}</div>
    </div>
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

function SwitchRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-ink-subtle">{sub}</div>}
      </div>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-bg-elevated"
        }`}
      >
        <span
          className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
