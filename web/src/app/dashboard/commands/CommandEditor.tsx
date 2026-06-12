"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ColorPicker } from "../self-roles/ColorPicker";
import { saveCommand, type CommandFormState } from "./actions";

interface Props {
  initial?: CommandFormState;
  originalName?: string;
  roles: { roleId: string; name: string; color: number }[];
  bot: { name: string; avatarUrl: string | null };
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_FORM: CommandFormState = {
  name: "",
  description: "Custom-Command",
  responseType: "text",
  response: "",
  embedTitle: "",
  embedDescription: "",
  embedColor: "#a855f7",
  embedImageUrl: "",
  embedFooter: "",
  ephemeral: false,
  allowedRoleIds: [],
};

export function CommandEditor({ initial, originalName, roles, bot, onClose, onSaved }: Props) {
  const [form, setForm] = useState<CommandFormState>(initial ?? DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Body-Scroll sperren während Modal offen ist
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const update = <K extends keyof CommandFormState>(key: K, value: CommandFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveCommand(form, originalName);
      if (!res.ok) {
        setError(res.error ?? "Fehler beim Speichern");
        return;
      }
      onSaved();
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-sm pt-[5vh]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-bg-card shadow-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-ink">
              {originalName
                ? `Bearbeiten: /${originalName}`
                : "Neuen Command anlegen"}
            </h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              Speichern triggert sofort Discord-Sync.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="grid h-8 w-8 place-items-center rounded-md text-ink-muted hover:bg-bg-hover hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_1fr]">
          {/* Form */}
          <div className="overflow-y-auto px-6 py-6 space-y-6 md:border-r md:border-line">
            <Section title="Allgemein">
              <Field label="Befehl">
                <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-bg-elevated/60 focus-within:border-brand/60">
                  <span className="grid place-items-center border-r border-line bg-bg-elevated/80 px-3 font-mono text-sm text-ink-subtle">
                    /
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      update("name", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                    }
                    placeholder="willkommen"
                    className="flex-1 bg-transparent px-3 py-2 font-mono text-sm placeholder:text-ink-subtle/60 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-ink-subtle">
                  Nur Kleinbuchstaben, Ziffern, _ und -. Max 32 Zeichen.
                </p>
              </Field>

              <Field label="Beschreibung">
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value.slice(0, 100))}
                  placeholder="Was tut dieser Command?"
                  className="input !px-3 !py-2"
                />
                <p className="mt-1 text-[11px] text-ink-subtle">
                  Erscheint im Discord-Autocomplete unter dem Befehl.
                </p>
              </Field>
            </Section>

            <Section title="Antwort">
              <Field label="Format">
                <SegmentedControl
                  value={form.responseType}
                  onChange={(v) => update("responseType", v)}
                  options={[
                    { value: "text", label: "Text" },
                    { value: "embed", label: "Embed" },
                  ]}
                />
              </Field>

              {form.responseType === "text" ? (
                <Field label="Text">
                  <textarea
                    value={form.response}
                    onChange={(e) => update("response", e.target.value.slice(0, 2000))}
                    rows={6}
                    placeholder="Hi {user}! Willkommen auf {server}."
                    className="input !px-3 !py-2 font-mono"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-ink-subtle">
                    <span>Markdown erlaubt · Platzhalter siehe Vorschau</span>
                    <span className="tabular-nums">{form.response.length} / 2000</span>
                  </div>
                </Field>
              ) : (
                <>
                  <Field label="Titel">
                    <input
                      type="text"
                      value={form.embedTitle}
                      onChange={(e) => update("embedTitle", e.target.value.slice(0, 256))}
                      placeholder="Optional"
                      className="input !px-3 !py-2"
                    />
                  </Field>

                  <Field label="Beschreibung">
                    <textarea
                      value={form.embedDescription}
                      onChange={(e) => update("embedDescription", e.target.value.slice(0, 4000))}
                      rows={5}
                      placeholder="Längere Texte mit Markdown + Platzhaltern…"
                      className="input !px-3 !py-2 font-mono"
                    />
                  </Field>

                  <Field label="Akzent-Farbe">
                    <ColorPicker
                      name="embedColor"
                      value={form.embedColor}
                      onChange={(c) => update("embedColor", c)}
                      label="Akzent-Farbe"
                    />
                  </Field>

                  <Field label="Bild-URL">
                    <input
                      type="url"
                      value={form.embedImageUrl}
                      onChange={(e) => update("embedImageUrl", e.target.value)}
                      placeholder="https://… (optional)"
                      className="input !px-3 !py-2"
                    />
                  </Field>

                  <Field label="Footer">
                    <input
                      type="text"
                      value={form.embedFooter}
                      onChange={(e) => update("embedFooter", e.target.value.slice(0, 2048))}
                      placeholder="Optional"
                      className="input !px-3 !py-2"
                    />
                  </Field>
                </>
              )}
            </Section>

            <Section title="Zugriff">
              <SwitchRow
                label="Nur Aufrufer sieht die Antwort"
                sub="Ephemeral — die Nachricht wird nicht in den Chat geposted."
                checked={form.ephemeral}
                onChange={(v) => update("ephemeral", v)}
              />

              <Field label="Berechtigte Rollen">
                <RoleMultiselect
                  roles={roles}
                  selected={form.allowedRoleIds}
                  onChange={(ids) => update("allowedRoleIds", ids)}
                />
                <p className="mt-1 text-[11px] text-ink-subtle">
                  Leer = alle dürfen ihn ausführen.
                </p>
              </Field>
            </Section>
          </div>

          {/* Preview */}
          <div className="overflow-y-auto bg-bg-base/60 px-6 py-6">
            <div className="sticky top-0 z-10 -mt-1 mb-3 flex items-baseline justify-between bg-bg-base/60 pb-2 pt-1 backdrop-blur-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
                Vorschau
              </span>
              <span className="text-[11px] text-ink-subtle">Live</span>
            </div>

            <PreviewBox form={form} bot={bot} />

            <details className="mt-5 rounded-xl border border-line bg-bg-card/60 text-xs">
              <summary className="cursor-pointer select-none px-3 py-2 text-ink-muted hover:text-ink">
                Platzhalter
              </summary>
              <div className="border-t border-line px-3 py-3">
                <PlaceholderTable />
              </div>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line bg-bg-elevated/30 px-6 py-3">
          <div className="min-w-0 text-xs">
            {error ? (
              <span className="text-rose-400">⚠ {error}</span>
            ) : (
              <span className="text-ink-subtle">
                Bei jeder Änderung wird der Command bei Discord neu registriert.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.name}
              className="btn-primary !px-3.5 !py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-bg-base border-t-transparent" />
                  Speichern…
                </>
              ) : (
                "Speichern"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Bausteine ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-bg-elevated/60 p-0.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              active
                ? "bg-bg-base text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
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
        <div className="text-sm text-ink">{label}</div>
        {sub && <div className="mt-0.5 text-[11px] text-ink-subtle">{sub}</div>}
      </div>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-gradient" : "bg-bg-elevated"
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

function RoleMultiselect({
  roles,
  selected,
  onChange,
}: {
  roles: { roleId: string; name: string; color: number }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  if (roles.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-bg-elevated/40 px-3 py-2 text-xs text-ink-subtle">
        Keine Rollen vorhanden.
      </div>
    );
  }

  return (
    <div className="max-h-44 overflow-y-auto rounded-xl border border-line bg-bg-elevated/40 py-1">
      {roles.map((r) => {
        const active = selected.includes(r.roleId);
        const color = r.color
          ? `#${r.color.toString(16).padStart(6, "0")}`
          : "#a1a1aa";
        return (
          <button
            key={r.roleId}
            type="button"
            onClick={() => toggle(r.roleId)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-bg-hover/80 text-ink"
                : "text-ink-muted hover:bg-bg-hover/40 hover:text-ink"
            }`}
          >
            <span
              className={`grid h-3.5 w-3.5 place-items-center rounded border ${
                active ? "border-brand bg-brand" : "border-line"
              }`}
            >
              {active && (
                <svg
                  viewBox="0 0 12 12"
                  className="h-2.5 w-2.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m2 6 3 3 5-6" />
                </svg>
              )}
            </span>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate">{r.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function PlaceholderTable() {
  const items: [string, string][] = [
    ["{user}", "Anzeigename"],
    ["{user.mention}", "@-Mention"],
    ["{user.id}", "Discord-ID"],
    ["{server}", "Server-Name"],
    ["{channel}", "#kanal"],
    ["{random:a|b|c}", "zufällige Auswahl"],
  ];
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[11px]">
      {items.map(([key, desc]) => (
        <div key={key} className="contents">
          <dt>
            <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-ink">
              {key}
            </code>
          </dt>
          <dd className="text-ink-muted">{desc}</dd>
        </div>
      ))}
    </dl>
  );
}

function PreviewBox({
  form,
  bot,
}: {
  form: CommandFormState;
  bot: { name: string; avatarUrl: string | null };
}) {
  const exampleUser = "Max";
  const example = (s: string) =>
    s
      .replace(/\{user\}/g, exampleUser)
      .replace(/\{user\.mention\}/g, `@${exampleUser}`)
      .replace(/\{server\}/g, "Dein Server")
      .replace(/\{channel\}/g, "#allgemein")
      .replace(/\{random:([^}]+)\}/g, (_, opts: string) => opts.split("|")[0]?.trim() ?? "");

  const BotAvatar = () =>
    bot.avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bot.avatarUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full"
      />
    ) : (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
        {bot.name[0]?.toUpperCase() ?? "B"}
      </span>
    );

  const BotHeader = () => (
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-semibold text-white">{bot.name}</span>
      <span className="rounded bg-brand/15 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-brand">
        App
      </span>
      <span className="text-[11px] text-ink-subtle">heute · 14:32</span>
    </div>
  );

  // Top-Slash-Banner (Discord-typischer Hinweis)
  const slashLine = (
    <div className="mb-2 flex items-center gap-2 text-[11px] text-ink-subtle">
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
        <path d="M5 1a1 1 0 0 1 .89 1.45L4.5 5h2.79l1.25-2.5a1 1 0 1 1 1.79.9L9.79 5H11a1 1 0 1 1 0 2H8.79l-1 2H10a1 1 0 1 1 0 2H6.79L5.45 13.55a1 1 0 1 1-1.79-.9L4.71 11H4a1 1 0 1 1 0-2h1.71l1-2H4a1 1 0 0 1 0-2h3.71L8.95 1.55A1 1 0 0 1 8.05.55 1 1 0 0 1 5 1Z" />
      </svg>
      <span>
        {exampleUser} hat <code className="rounded bg-bg-elevated px-1 py-0 font-mono text-[10px]">/{form.name || "..."}</code> verwendet
      </span>
    </div>
  );

  if (form.responseType === "text") {
    return (
      <div className="rounded-xl border border-line bg-bg-card p-4">
        {slashLine}
        <div className="flex items-start gap-3">
          <BotAvatar />
          <div className="min-w-0 flex-1">
            <BotHeader />
            <div className="mt-1 whitespace-pre-wrap text-sm text-ink">
              {example(form.response) || (
                <span className="italic text-ink-subtle">noch keine Antwort</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Embed
  const titleEx = form.embedTitle ? example(form.embedTitle) : null;
  const descEx = form.embedDescription
    ? example(form.embedDescription)
    : form.response
      ? example(form.response)
      : null;

  return (
    <div className="rounded-xl border border-line bg-bg-card p-4">
      {slashLine}
      <div className="flex items-start gap-3">
        <BotAvatar />
        <div className="min-w-0 flex-1">
          <BotHeader />
          <div
            className="mt-2 max-w-md rounded border-l-[3px] bg-bg-elevated/60 p-3"
            style={{ borderLeftColor: form.embedColor || "#a855f7" }}
          >
            {titleEx && (
              <div className="text-sm font-semibold text-white">{titleEx}</div>
            )}
            {descEx && (
              <div className="mt-1 whitespace-pre-wrap text-sm text-ink">{descEx}</div>
            )}
            {!titleEx && !descEx && (
              <div className="italic text-ink-subtle text-sm">
                Embed ist noch leer
              </div>
            )}
            {form.embedImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.embedImageUrl}
                alt=""
                className="mt-2 max-h-48 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            {form.embedFooter && (
              <div className="mt-2 text-[11px] text-ink-subtle">
                {example(form.embedFooter)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
