"use client";

import { useState, useTransition } from "react";
import { runDiagnose, type DiagnoseData } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  totalMembers: "Mitglieder gesamt",
  humanMembers: "Mitglieder (ohne Bots)",
  onlineMembers: "Gerade online",
};

export function DiagnosePanel() {
  const [data, setData] = useState<DiagnoseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();

  const onRun = () => {
    setError(null);
    startLoad(async () => {
      const r = await runDiagnose();
      if (r.ok) setData(r.data);
      else setError(r.error);
    });
  };

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Diagnose</h2>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Zeigt was der Bot gerade sieht — hilfreich um Probleme zu identifizieren.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={isLoading}
          className="btn-secondary disabled:opacity-60"
        >
          {isLoading ? "Lade…" : "Diagnose ausführen"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DiagStat label="Mitglieder" value={data.memberCount} />
            <DiagStat
              label="Im Cache"
              value={`${data.membersCached} / ${data.memberCount}`}
              ok={data.membersCached >= data.memberCount * 0.9}
            />
            <DiagStat
              label="Presences"
              value={data.presencesCached}
              ok={data.presencesCached > 0}
              hint={
                data.presencesCached === 0
                  ? 'Keine Presence-Daten — "Gerade online" wird 0 sein. Presence-Intent im Dev-Portal aktivieren!'
                  : undefined
              }
            />
            <DiagStat
              label="Online (Cache)"
              value={data.presencesNonOffline}
            />
          </div>

          {data.lastTickAt && (
            <p className="text-xs text-ink-subtle">
              Letzter Scheduler-Tick: {new Date(data.lastTickAt).toLocaleString("de-DE")}
            </p>
          )}

          {data.rows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-bg-elevated/60 text-xs uppercase tracking-wider text-ink-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Stat</th>
                    <th className="px-3 py-2 text-right font-medium">Wert</th>
                    <th className="px-3 py-2 text-left font-medium">Erwarteter Name</th>
                    <th className="px-3 py-2 text-left font-medium">Aktueller Name</th>
                    <th className="px-3 py-2 text-center font-medium">Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2.5">
                        {TYPE_LABEL[r.type] ?? r.type}
                        {!r.enabled && (
                          <span className="ml-2 text-[10px] uppercase text-zinc-500">pausiert</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                        {r.computedValue ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {r.expectedName ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {r.actualName ?? (
                          <span className="text-rose-400">kein Channel</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {r.matches === true ? (
                          <span className="text-emerald-400">✓</span>
                        ) : r.matches === false ? (
                          <span className="text-rose-400">✗</span>
                        ) : (
                          <span className="text-ink-subtle">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DiagStat({
  label,
  value,
  ok,
  hint,
}: {
  label: string;
  value: number | string;
  ok?: boolean;
  hint?: string;
}) {
  const okClass =
    ok === false ? "border-rose-500/40 bg-rose-500/5" : "border-line bg-bg-elevated/40";
  return (
    <div className={`rounded-xl border p-3 ${okClass}`}>
      <div className="text-[11px] uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</div>
      {hint && <div className="mt-1 text-[10px] text-rose-300">{hint}</div>}
    </div>
  );
}
