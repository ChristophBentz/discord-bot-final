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

export function AiSettingsForm({ initial, channels }: Props) {
  const [form, setForm] = useState<AiSettings>(initial);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: boolean; msg: string; imageUrl?: string } | null
  >(null);

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
      {/* Provider */}
      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium text-ink">Provider</h3>
          <span className="text-[11px] text-ink-subtle">MiniMax</span>
        </div>

        <div className="mt-4 space-y-4">
          <Field label="API-Region">
            <Select
              value={form.aiApiBaseUrl}
              onChange={(v) => update("aiApiBaseUrl", v)}
            >
              <option value="https://api.minimaxi.com">International (api.minimaxi.com)</option>
              <option value="https://api.minimax.chat">Mainland China (api.minimax.chat)</option>
              <option value="https://api.minimax.io">Legacy (api.minimax.io)</option>
            </Select>
          </Field>

          <Field label="API-Key">
            <div className="flex items-stretch gap-2">
              <TextInput
                type={showKey ? "text" : "password"}
                value={form.aiApiKey}
                onChange={(v) => update("aiApiKey", v)}
                placeholder="sk-api-…"
                mono
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="rounded-md border border-line bg-bg-elevated px-3 text-xs text-ink-muted hover:bg-bg-hover hover:text-ink"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          <Field label="Group-ID" hint="MiniMax Account → Basic Information.">
            <TextInput
              value={form.aiGroupId}
              onChange={(v) => update("aiGroupId", v)}
              placeholder="(leer wenn nicht benötigt)"
              mono
            />
          </Field>
        </div>
      </Card>

      {/* Image Feature */}
      <section className="overflow-hidden rounded-lg border border-line bg-bg-card">
        <div className="flex items-center gap-3 px-5 py-4">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-bg-elevated/60 ${
              form.aiEnabled ? "text-ink" : "text-ink-subtle"
            }`}
          >
            <ImageIcon />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-medium text-ink">Bild-Generierung</h3>
              <code className="font-mono text-[11px] text-ink-subtle">/image</code>
            </div>
          </div>
          <Switch checked={form.aiEnabled} onChange={(v) => update("aiEnabled", v)} />
        </div>

        {form.aiEnabled && (
          <div className="space-y-4 border-t border-line px-5 py-4">
            <Field label="Modell">
              <TextInput
                value={form.aiImageModel}
                onChange={(v) => update("aiImageModel", v)}
                mono
              />
            </Field>
            <Field label="Erlaubter Channel" hint="Leer = alle Channels erlaubt.">
              <Select
                value={form.aiImageChannelId}
                onChange={(v) => update("aiImageChannelId", v)}
              >
                <option value="">— Alle Channels —</option>
                {textChannels.map((c) => (
                  <option key={c.channelId} value={c.channelId}>
                    #{c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Limit pro User pro 24h">
              <div className="w-32">
                <TextInput
                  type="number"
                  value={String(form.aiImagesPerUserPerDay)}
                  onChange={(v) => update("aiImagesPerUserPerDay", parseInt(v) || 0)}
                />
              </div>
            </Field>
          </div>
        )}
      </section>

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
      aria-pressed={checked}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
        checked ? "border-ink bg-ink" : "border-line bg-bg-elevated hover:bg-bg-hover"
      }`}
    >
      <span
        className={`absolute left-0.5 top-[2px] inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const fieldBase =
  "w-full rounded-md border border-line bg-bg-elevated/60 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle/60 transition-colors focus:border-ink/30 focus:outline-none";

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${fieldBase} ${mono ? "font-mono text-xs" : ""}`}
    />
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldBase} appearance-none pr-8`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
