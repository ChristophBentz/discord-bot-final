"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { saveSettings, updateNow } from "./actions";
import { StatList } from "./StatList";

export interface StatDTO {
  id: number;
  type: string;
  nameTemplate: string;
  channelId: string | null;
  enabled: boolean;
  lastValue: number | null;
  lastUpdate: string | null;
}

interface Props {
  initial: {
    serverStatsEnabled: boolean;
    serverStatsCategoryId: string | null;
  };
  stats: StatDTO[];
  channels: ChannelOption[];
}

export function ServerStatsManager({ initial, stats, channels }: Props) {
  const [enabled, setEnabled] = useState(initial.serverStatsEnabled);
  const [categoryId, setCategoryId] = useState(initial.serverStatsCategoryId ?? "");
  const [savingFeedback, setSavingFeedback] = useState<{
    kind: "ok" | "error";
    msg: string;
  } | null>(null);
  const [updateFeedback, setUpdateFeedback] = useState<{
    kind: "ok" | "error";
    msg: string;
  } | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isUpdating, startUpdate] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingFeedback(null);
    const fd = new FormData(e.currentTarget);
    startSave(async () => {
      const r = await saveSettings(fd);
      setSavingFeedback(
        r.ok
          ? { kind: "ok", msg: "Gespeichert. Bot legt aktive Stat-Channels an." }
          : { kind: "error", msg: r.error },
      );
    });
  };

  const onUpdate = () => {
    setUpdateFeedback(null);
    startUpdate(async () => {
      const r = await updateNow();
      setUpdateFeedback(
        r.ok
          ? {
              kind: "ok",
              msg: `${r.updated} aktualisiert, ${r.skipped} unverändert.`,
            }
          : { kind: "error", msg: r.error },
      );
    });
  };

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
            <Toggle
              name="serverStatsEnabled"
              label="Server-Stats aktiv"
              description="Wenn aktiv, legt der Bot für jeden Stat unten einen Locked-Voice-Channel an und aktualisiert ihn alle 10 Minuten. Deaktivieren stoppt die Updates (Channels bleiben bestehen)."
              defaultChecked={initial.serverStatsEnabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Kategorie</span>
              <ChannelPicker
                name="serverStatsCategoryId"
                defaultValue={initial.serverStatsCategoryId}
                value={categoryId}
                channels={channels}
                allowedTypes={[4]}
                groupByCategory={false}
                onChange={(v) => setCategoryId(v)}
              />
              <p className="mt-1.5 text-xs text-ink-subtle">
                Tipp: leg eine Kategorie ganz oben in deiner Channel-Liste an, damit die Stats
                immer sichtbar sind.
              </p>
            </div>
          )}

          {!enabled && (
            <input
              type="hidden"
              name="serverStatsCategoryId"
              value={initial.serverStatsCategoryId ?? ""}
            />
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary disabled:opacity-60"
            >
              {isSaving ? "Speichere…" : "Speichern"}
            </button>
            {savingFeedback && (
              <span
                className={`text-sm ${
                  savingFeedback.kind === "ok" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {savingFeedback.msg}
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Stats</h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {stats.length === 0
                ? "Noch keine Stats angelegt."
                : `${stats.length} Stat${stats.length === 1 ? "" : "s"} konfiguriert`}
            </p>
          </div>
          {stats.length > 0 && enabled && (
            <div className="flex items-center gap-2">
              {updateFeedback && (
                <span
                  className={`text-xs ${
                    updateFeedback.kind === "ok" ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {updateFeedback.msg}
                </span>
              )}
              <button
                type="button"
                onClick={onUpdate}
                disabled={isUpdating}
                className="btn-secondary text-sm disabled:opacity-60"
              >
                {isUpdating ? "Update läuft…" : "Jetzt aktualisieren"}
              </button>
            </div>
          )}
        </div>

        <StatList stats={stats} disabled={!enabled} />
      </section>
    </div>
  );
}
