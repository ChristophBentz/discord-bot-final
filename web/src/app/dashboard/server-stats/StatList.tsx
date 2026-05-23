"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  createStat,
  deleteStat,
  toggleStat,
  updateStat,
  type StatType,
} from "./actions";
import type { StatDTO } from "./ServerStatsManager";

const STAT_TYPES: { value: StatType; label: string; defaultTemplate: string; note?: string }[] = [
  {
    value: "totalMembers",
    label: "Mitglieder gesamt",
    defaultTemplate: "👥 Mitglieder: {count}",
    note: "Inklusive Bots.",
  },
  {
    value: "humanMembers",
    label: "Mitglieder (ohne Bots)",
    defaultTemplate: "👤 Mitglieder: {count}",
  },
  {
    value: "onlineMembers",
    label: "Gerade online",
    defaultTemplate: "🟢 Online: {count}",
    note: 'Benötigt aktivierte „Presence Intent" im Discord Developer Portal.',
  },
];

interface Props {
  stats: StatDTO[];
  disabled: boolean;
}

export function StatList({ stats, disabled }: Props) {
  const [adding, setAdding] = useState(false);
  const usedTypes = new Set(stats.map((s) => s.type));
  const availableTypes = STAT_TYPES.filter((t) => !usedTypes.has(t.value));

  return (
    <div className="space-y-3">
      {stats.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-line bg-bg-elevated/30 px-6 py-8 text-center text-sm text-ink-muted">
          Noch keine Stats konfiguriert.
        </div>
      )}

      {stats.map((s) => (
        <StatRow key={s.id} stat={s} disabled={disabled} />
      ))}

      {adding && availableTypes.length > 0 && (
        <AddStatForm
          available={availableTypes}
          onDone={() => setAdding(false)}
        />
      )}

      {!adding && availableTypes.length > 0 && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="btn-secondary"
        >
          + Stat hinzufügen
        </button>
      )}

      {availableTypes.length === 0 && !adding && (
        <p className="text-xs text-ink-subtle">Alle verfügbaren Stat-Typen sind bereits angelegt.</p>
      )}
    </div>
  );
}

function StatRow({ stat, disabled }: { stat: StatDTO; disabled: boolean }) {
  const meta = STAT_TYPES.find((t) => t.value === stat.type);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [template, setTemplate] = useState(stat.nameTemplate);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const onSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startSave(async () => {
      const r = await updateStat(stat.id, fd);
      if (r.ok) setEditing(false);
      else setError(r.error);
    });
  };

  const previewName = template.replaceAll("{count}", stat.lastValue?.toString() ?? "42");

  if (editing) {
    return (
      <form onSubmit={onSave} className="rounded-2xl border border-brand/40 bg-brand/5 p-4 space-y-3">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {meta?.label ?? stat.type}
          </span>
          <input
            name="nameTemplate"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            maxLength={100}
            className="input w-full"
            required
          />
          <p className="mt-1.5 text-xs text-ink-subtle">
            Platzhalter <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px]">{"{count}"}</code> wird durch den aktuellen Wert ersetzt.
          </p>
          <p className="mt-2 text-xs">
            <span className="text-ink-subtle">Vorschau:</span>{" "}
            <span className="font-medium text-ink">🔊 {previewName}</span>
          </p>
        </div>
        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary disabled:opacity-60">
            {isSaving ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </form>
    );
  }

  const renderedName = stat.nameTemplate.replaceAll(
    "{count}",
    stat.lastValue?.toString() ?? "—",
  );
  const lastUpdate = stat.lastUpdate ? new Date(stat.lastUpdate).toLocaleString("de-DE") : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-bg-elevated/30 transition-colors hover:border-line-strong">
      {/* Header */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-semibold text-ink">{meta?.label ?? stat.type}</h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              stat.enabled
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-zinc-500/15 text-zinc-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                stat.enabled ? "bg-emerald-400" : "bg-zinc-500"
              }`}
            />
            {stat.enabled ? "Aktiv" : "Pausiert"}
          </span>
        </div>
        <div className="mt-1 inline-flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-ink-subtle">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <code className="truncate rounded bg-bg-elevated px-2 py-0.5 font-mono text-xs text-ink">
            {renderedName}
          </code>
        </div>
      </div>

      {/* Meta-Pills */}
      <div className="mt-3 flex flex-wrap gap-2 px-5">
        <Pill
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-6" />
            </svg>
          }
        >
          <span className="text-ink-subtle">Aktueller Wert</span>
          <span className="font-medium text-ink">{stat.lastValue ?? "—"}</span>
        </Pill>
        {lastUpdate && (
          <Pill
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            }
          >
            <span className="text-ink-subtle">Letztes Update</span>
            <span className="font-medium text-ink">{lastUpdate}</span>
          </Pill>
        )}
      </div>

      {meta?.note && (
        <div className="mt-3 px-5">
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>{meta.note}</span>
          </div>
        </div>
      )}

      {/* Action-Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-bg-elevated/40 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <ActionButton
            onClick={() => {
              startToggle(async () => {
                await toggleStat(stat.id, !stat.enabled);
              });
            }}
            disabled={isToggling || disabled}
            icon={
              stat.enabled ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )
            }
          >
            {stat.enabled ? "Pausieren" : "Aktivieren"}
          </ActionButton>

          <ActionButton
            onClick={() => setEditing(true)}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
          >
            Bearbeiten
          </ActionButton>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmDel(false)}
                className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-bg-hover hover:text-ink"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  startDelete(async () => {
                    await deleteStat(stat.id);
                  });
                }}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/50 bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/25"
              >
                {isDeleting ? "Lösche…" : "Ja, löschen"}
              </button>
            </div>
          ) : (
            <ActionButton
              onClick={() => setConfirmDel(true)}
              tone="rose"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              }
            >
              Löschen
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-elevated px-2.5 py-1 text-xs text-ink-muted">
      {icon}
      {children}
    </span>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon,
  tone = "default",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  tone?: "default" | "rose";
  children: ReactNode;
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
      : "text-ink-muted hover:bg-bg-hover hover:text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {icon}
      {children}
    </button>
  );
}

function AddStatForm({
  available,
  onDone,
}: {
  available: typeof STAT_TYPES;
  onDone: () => void;
}) {
  const [type, setType] = useState<StatType>(available[0]!.value);
  const meta = available.find((t) => t.value === type)!;
  const [template, setTemplate] = useState(meta.defaultTemplate);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();

  const onTypeChange = (newType: StatType) => {
    const newMeta = available.find((t) => t.value === newType)!;
    setType(newType);
    setTemplate(newMeta.defaultTemplate);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startCreate(async () => {
      const r = await createStat(fd);
      if (r.ok) onDone();
      else setError(r.error);
    });
  };

  const preview = template.replaceAll("{count}", "42");

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-brand/40 bg-brand/5 p-4 space-y-3"
    >
      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Stat-Typ</span>
        <select
          name="type"
          value={type}
          onChange={(e) => onTypeChange(e.target.value as StatType)}
          className="input w-full"
        >
          {available.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {meta.note && <p className="mt-1.5 text-[11px] text-ink-subtle">ℹ {meta.note}</p>}
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Channel-Name</span>
        <input
          name="nameTemplate"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          maxLength={100}
          className="input w-full"
          required
        />
        <p className="mt-1.5 text-xs text-ink-subtle">
          <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px]">{"{count}"}</code>{" "}
          wird durch den aktuellen Wert ersetzt.
        </p>
        <p className="mt-2 text-xs">
          <span className="text-ink-subtle">Vorschau:</span>{" "}
          <span className="font-medium text-ink">🔊 {preview}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn-secondary">
          Abbrechen
        </button>
        <button type="submit" disabled={isCreating} className="btn-primary disabled:opacity-60">
          {isCreating ? "Lege an…" : "Stat anlegen"}
        </button>
      </div>
    </form>
  );
}
