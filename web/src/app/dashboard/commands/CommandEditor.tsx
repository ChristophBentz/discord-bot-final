"use client";

import { useState, useTransition } from "react";
import { saveCommand, type CommandFormState } from "./actions";

interface Props {
  initial?: CommandFormState;
  originalName?: string;
  roles: { roleId: string; name: string; color: number }[];
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

export function CommandEditor({ initial, originalName, roles, onClose, onSaved }: Props) {
  const [form, setForm] = useState<CommandFormState>(initial ?? DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[5vh]" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-brand">
              {originalName ? "Command bearbeiten" : "Neuer Command"}
            </div>
            <h2 className="mt-0.5 text-lg font-semibold text-ink">
              {form.name ? `/${form.name}` : "/dein-command"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted hover:bg-bg-hover hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_1fr]">
          {/* Form */}
          <div className="overflow-y-auto border-r border-line px-6 py-5 space-y-5">
            <Field label="Name" hint="a-z, 0-9, _ und - · wird zu /<name>">
              <div className="flex items-center gap-2">
                <span className="text-ink-subtle">/</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="willkommen"
                  className="input flex-1"
                />
              </div>
            </Field>

            <Field label="Beschreibung" hint="Wird in der Discord-Slash-Command-Auswahl angezeigt">
              <input
                type="text"
                value={form.description}
                onChange={(e) => update("description", e.target.value.slice(0, 100))}
                placeholder="Was tut dieser Command?"
                className="input w-full"
              />
            </Field>

            <Field label="Antwort-Typ">
              <div className="flex gap-2">
                <PillButton
                  active={form.responseType === "text"}
                  onClick={() => update("responseType", "text")}
                >
                  Einfacher Text
                </PillButton>
                <PillButton
                  active={form.responseType === "embed"}
                  onClick={() => update("responseType", "embed")}
                >
                  Embed
                </PillButton>
              </div>
            </Field>

            {form.responseType === "text" ? (
              <Field label="Antwort-Text" hint="Platzhalter erlaubt — siehe Vorschau unten">
                <textarea
                  value={form.response}
                  onChange={(e) => update("response", e.target.value.slice(0, 2000))}
                  rows={6}
                  placeholder="Hi {user}! Willkommen auf {server}."
                  className="input w-full font-mono text-sm"
                />
                <div className="mt-1 text-[11px] text-ink-subtle">
                  {form.response.length} / 2000
                </div>
              </Field>
            ) : (
              <>
                <Field label="Embed-Title">
                  <input
                    type="text"
                    value={form.embedTitle}
                    onChange={(e) => update("embedTitle", e.target.value.slice(0, 256))}
                    placeholder="Optional"
                    className="input w-full"
                  />
                </Field>
                <Field label="Embed-Description">
                  <textarea
                    value={form.embedDescription}
                    onChange={(e) => update("embedDescription", e.target.value.slice(0, 4000))}
                    rows={5}
                    placeholder="Längere Texte mit Markdown + Platzhaltern…"
                    className="input w-full font-mono text-sm"
                  />
                </Field>
                <Field label="Akzent-Farbe">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.embedColor}
                      onChange={(e) => update("embedColor", e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-line bg-transparent"
                    />
                    <input
                      type="text"
                      value={form.embedColor}
                      onChange={(e) => update("embedColor", e.target.value)}
                      className="input flex-1 font-mono text-sm"
                    />
                  </div>
                </Field>
                <Field label="Bild-URL" hint="Wird am unteren Embed-Rand angezeigt">
                  <input
                    type="url"
                    value={form.embedImageUrl}
                    onChange={(e) => update("embedImageUrl", e.target.value)}
                    placeholder="https://…"
                    className="input w-full text-sm"
                  />
                </Field>
                <Field label="Footer">
                  <input
                    type="text"
                    value={form.embedFooter}
                    onChange={(e) => update("embedFooter", e.target.value.slice(0, 2048))}
                    placeholder="Optional"
                    className="input w-full text-sm"
                  />
                </Field>
              </>
            )}

            <Field label="Sichtbarkeit">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.ephemeral}
                  onChange={(e) => update("ephemeral", e.target.checked)}
                  className="h-4 w-4 rounded border-line"
                />
                Nur Aufrufer sieht die Antwort (ephemeral)
              </label>
            </Field>

            <Field label="Berechtigung" hint="Leer = alle dürfen — sonst nur die ausgewählten Rollen">
              <RolePicker
                roles={roles}
                selected={form.allowedRoleIds}
                onChange={(ids) => update("allowedRoleIds", ids)}
              />
            </Field>

            <PlaceholderHelp />
          </div>

          {/* Preview */}
          <div className="overflow-y-auto bg-bg-base/40 px-6 py-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Vorschau
            </div>
            <div className="mt-3">
              <PreviewBox form={form} />
            </div>
            <PreviewHint />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line bg-bg-elevated/40 px-6 py-3">
          <div className="min-w-0 text-xs text-ink-muted">
            {error ? (
              <span className="text-rose-400">⚠ {error}</span>
            ) : (
              <span className="text-ink-subtle">Speichern triggert sofort Discord-Sync.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-bg-elevated px-4 py-2 text-sm text-ink-muted hover:bg-bg-hover hover:text-ink"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.name}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {pending ? "Speichern…" : "Speichern + Sync"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bausteine ─────────────────────────────────────────────────────────────

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
      <label className="block text-xs font-medium uppercase tracking-wider text-ink-subtle">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-brand bg-brand/15 text-brand-fg text-white"
          : "border-line bg-bg-elevated text-ink-muted hover:bg-bg-hover hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function RolePicker({
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

  return (
    <div className="max-h-40 overflow-y-auto rounded-lg border border-line bg-bg-elevated/40 p-2">
      {roles.length === 0 && (
        <div className="px-2 py-3 text-xs text-ink-subtle">Keine Rollen vorhanden.</div>
      )}
      {roles.map((r) => {
        const active = selected.includes(r.roleId);
        const color = r.color ? `#${r.color.toString(16).padStart(6, "0")}` : "#a1a1aa";
        return (
          <label
            key={r.roleId}
            className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm ${active ? "bg-brand/10" : "hover:bg-bg-hover/60"}`}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => toggle(r.roleId)}
              className="h-3.5 w-3.5"
            />
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate text-ink">{r.name}</span>
          </label>
        );
      })}
    </div>
  );
}

function PlaceholderHelp() {
  return (
    <details className="rounded-lg border border-line bg-bg-elevated/40 p-3 text-xs text-ink-muted">
      <summary className="cursor-pointer font-medium text-ink">Verfügbare Platzhalter</summary>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
        <span>{"{user}"}</span>
        <span className="text-ink-subtle">Anzeigename</span>
        <span>{"{user.mention}"}</span>
        <span className="text-ink-subtle">@-Mention</span>
        <span>{"{user.id}"}</span>
        <span className="text-ink-subtle">Discord-ID</span>
        <span>{"{server}"}</span>
        <span className="text-ink-subtle">Server-Name</span>
        <span>{"{channel}"}</span>
        <span className="text-ink-subtle">#kanal</span>
        <span>{"{random:a|b|c}"}</span>
        <span className="text-ink-subtle">Zufallswahl</span>
      </div>
    </details>
  );
}

function PreviewBox({ form }: { form: CommandFormState }) {
  const exampleUser = "Max";
  const example = (s: string) =>
    s
      .replace(/\{user\}/g, exampleUser)
      .replace(/\{user\.mention\}/g, `@${exampleUser}`)
      .replace(/\{server\}/g, "Jumpy's Server")
      .replace(/\{channel\}/g, "#allgemein")
      .replace(/\{random:([^}]+)\}/g, (_, opts: string) => opts.split("|")[0]?.trim() ?? "");

  if (form.responseType === "text") {
    return (
      <div className="rounded-lg border border-line bg-bg-card p-4">
        <DiscordMsgHeader user={exampleUser} />
        <div className="mt-1 whitespace-pre-wrap text-sm text-ink">
          {example(form.response) || (
            <span className="text-ink-subtle italic">(noch keine Antwort)</span>
          )}
        </div>
      </div>
    );
  }

  const titleEx = form.embedTitle ? example(form.embedTitle) : null;
  const descEx = form.embedDescription
    ? example(form.embedDescription)
    : form.response
      ? example(form.response)
      : null;

  return (
    <div className="rounded-lg border border-line bg-bg-card p-4">
      <DiscordMsgHeader user={exampleUser} />
      <div
        className="mt-2 rounded border-l-4 bg-bg-elevated/60 p-3"
        style={{ borderLeftColor: form.embedColor || "#a855f7" }}
      >
        {titleEx && <div className="text-sm font-semibold text-white">{titleEx}</div>}
        {descEx && (
          <div className="mt-1 whitespace-pre-wrap text-sm text-ink">{descEx}</div>
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
          <div className="mt-2 text-[11px] text-ink-subtle">{example(form.embedFooter)}</div>
        )}
      </div>
    </div>
  );
}

function DiscordMsgHeader({ user }: { user: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="h-6 w-6 rounded-full bg-brand-gradient" />
      <span className="font-semibold text-white">{user}</span>
      <span className="text-ink-subtle">heute · 14:32</span>
    </div>
  );
}

function PreviewHint() {
  return (
    <p className="mt-3 text-[11px] text-ink-subtle">
      Vorschau verwendet Beispieldaten · Platzhalter werden zur Laufzeit ersetzt.
    </p>
  );
}
