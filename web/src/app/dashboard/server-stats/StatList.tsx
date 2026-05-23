"use client";

import { useState, useTransition } from "react";
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

  return (
    <div className="rounded-2xl border border-line bg-bg-elevated/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
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
            <h3 className="truncate text-sm font-semibold text-ink">{meta?.label ?? stat.type}</h3>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-ink-subtle">🔊</span>
            <code className="rounded bg-bg-elevated px-2 py-0.5 font-mono text-xs text-ink">
              {stat.nameTemplate.replaceAll(
                "{count}",
                stat.lastValue?.toString() ?? "—",
              )}
            </code>
          </div>
          {meta?.note && (
            <p className="mt-1.5 text-[11px] text-ink-subtle">ℹ {meta.note}</p>
          )}
          {stat.lastUpdate && (
            <p className="mt-1 text-[11px] text-ink-subtle">
              Letztes Update: {new Date(stat.lastUpdate).toLocaleString("de-DE")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              startToggle(async () => {
                await toggleStat(stat.id, !stat.enabled);
              });
            }}
            disabled={isToggling || disabled}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-bg-hover hover:text-ink disabled:opacity-50"
          >
            {stat.enabled ? "Pausieren" : "Aktivieren"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-bg-hover hover:text-ink"
          >
            Bearbeiten
          </button>
          {confirmDel ? (
            <button
              type="button"
              onClick={() => {
                startDelete(async () => {
                  await deleteStat(stat.id);
                });
              }}
              disabled={isDeleting}
              className="rounded-md border border-rose-500/50 bg-rose-500/15 px-2.5 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/25"
            >
              {isDeleting ? "Lösche…" : "Wirklich?"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
            >
              Löschen
            </button>
          )}
        </div>
      </div>
    </div>
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
