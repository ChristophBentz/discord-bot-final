"use client";

import { useState, useTransition } from "react";
import { resetAndRecreate, runDiagnose, type DiagnoseData } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  totalMembers: "Mitglieder gesamt",
  humanMembers: "Mitglieder (ohne Bots)",
  onlineMembers: "Gerade online",
};

const STATUS_LABEL: Record<string, { text: string; tone: "ok" | "warn" | "error" }> = {
  ok: { text: "OK", tone: "ok" },
  no_channel_id: { text: "Channel nie angelegt", tone: "warn" },
  channel_missing: { text: "Channel wurde gelöscht", tone: "error" },
  wrong_type: { text: "Channel falscher Typ", tone: "error" },
};

export function DiagnosePanel() {
  const [data, setData] = useState<DiagnoseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [isResetting, startReset] = useTransition();

  const onRun = () => {
    setError(null);
    startLoad(async () => {
      const r = await runDiagnose();
      if (r.ok) setData(r.data);
      else setError(r.error);
    });
  };

  const onReset = () => {
    setResetMsg(null);
    startReset(async () => {
      const r = await resetAndRecreate();
      if (r.ok) {
        setResetMsg({
          kind: "ok",
          text: `${r.recreated} Channel${r.recreated === 1 ? "" : "s"} neu angelegt.`,
        });
        // Diagnose direkt neu laden
        const d = await runDiagnose();
        if (d.ok) setData(d.data);
      } else {
        setResetMsg({ kind: "error", text: r.error });
      }
    });
  };

  const hasBrokenStats =
    data?.rows.some((r) => r.enabled && r.status !== "ok") ?? false;

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Diagnose</h2>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Zeigt was der Bot gerade sieht — hilfreich um Probleme zu identifizieren.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRun}
            disabled={isLoading}
            className="btn-secondary disabled:opacity-60"
          >
            {isLoading ? "Lade…" : "Diagnose ausführen"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
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
                  ? 'Presence-Intent im Dev-Portal aktivieren'
                  : undefined
              }
            />
            <DiagStat label="Online (Cache)" value={data.presencesNonOffline} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ink-subtle">Kategorie:</span>
            {data.categoryId ? (
              data.categoryExists ? (
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                  ✓ {data.categoryName}
                </span>
              ) : (
                <span className="rounded bg-rose-500/15 px-2 py-0.5 text-rose-300">
                  ✗ Kategorie {data.categoryId} nicht gefunden
                </span>
              )
            ) : (
              <span className="text-ink-subtle">keine gesetzt</span>
            )}
          </div>

          {data.lastTickAt && (
            <p className="text-xs text-ink-subtle">
              Letzter Scheduler-Tick: {new Date(data.lastTickAt).toLocaleString("de-DE")}
            </p>
          )}

          {hasBrokenStats && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="text-amber-200">
                <span className="font-semibold">Aktion empfohlen:</span> Channels neu anlegen lassen
                (löscht stale DB-Referenzen und erstellt frische Voice-Channels).
              </div>
              <button
                type="button"
                onClick={onReset}
                disabled={isResetting}
                className="rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/30 disabled:opacity-60"
              >
                {isResetting ? "Lege an…" : "Channels neu anlegen"}
              </button>
            </div>
          )}

          {resetMsg && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                resetMsg.kind === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              {resetMsg.text}
            </div>
          )}

          {data.rows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-bg-elevated/60 text-xs uppercase tracking-wider text-ink-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Stat</th>
                    <th className="px-3 py-2 text-right font-medium">Wert</th>
                    <th className="px-3 py-2 text-left font-medium">Channel</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.rows.map((r) => {
                    const statusInfo = STATUS_LABEL[r.status];
                    return (
                      <tr key={r.id}>
                        <td className="px-3 py-2.5">
                          <div>{TYPE_LABEL[r.type] ?? r.type}</div>
                          {!r.enabled && (
                            <div className="text-[10px] uppercase text-zinc-500">pausiert</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                          {r.computedValue ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          {r.actualName ? (
                            <code className="font-mono text-xs text-ink">{r.actualName}</code>
                          ) : (
                            <span className="text-xs text-ink-subtle">—</span>
                          )}
                          {r.channelId && (
                            <div className="mt-0.5 font-mono text-[10px] text-ink-subtle">
                              ID: {r.channelId}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs ${
                              statusInfo?.tone === "ok"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : statusInfo?.tone === "warn"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-rose-500/15 text-rose-300"
                            }`}
                          >
                            {statusInfo?.text ?? r.status}
                          </span>
                          {r.status === "ok" && r.matches === false && (
                            <div className="mt-1 text-[10px] text-amber-300">
                              Name veraltet (Rate-Limit?) — erwartet: {r.expectedName}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
