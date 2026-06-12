"use client";

import { useEffect, useState } from "react";

interface VersionInfo {
  current: { sha: string | null; short: string | null };
  latest: { sha: string; short: string; message: string; date: string; url: string } | null;
  latestError?: string;
  behindCount: number | null;
  upToDate: boolean | null;
  repoSlug: string | null;
  canUpdate: boolean;
  inDocker: boolean;
  reason?: string;
  updateInProgress: boolean;
}

interface UpdateStatus {
  active: boolean;
  step: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  log: string[];
}

const STEP_LABELS: Record<string, string> = {
  start: "Vorbereitung",
  backup: "DB-Backup",
  pull: "git pull",
  install: "Dependencies",
  migrate: "DB-Migration",
  build: "Build (db → bot → web)",
  register: "Slash-Commands",
  restart: "Bot neustarten",
  done: "Fertig",
  error: "Fehler",
};

const STEP_ORDER = ["start", "backup", "pull", "install", "migrate", "build", "register", "restart", "done"];

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `vor ${s}s`;
  return `vor ${Math.floor(s / 60)} Min`;
}

export function UpdateCard() {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Initial version load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [v, s] = await Promise.all([
          fetch("/api/system/version", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/system/update", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (!cancelled) {
          setVersion(v);
          setStatus(s);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Fehler");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Status pollen wenn Update aktiv
  const polling = (status?.active ?? false) || version?.updateInProgress;
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const s = await fetch("/api/system/update", { cache: "no-store" }).then((r) => r.json());
        setStatus(s);
        // Wenn fertig (kein active mehr): version neu laden
        if (!s.active && s.finishedAt) {
          const v = await fetch("/api/system/version", { cache: "no-store" }).then((r) => r.json());
          setVersion(v);
        }
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [polling]);

  async function triggerUpdate() {
    setTriggering(true);
    setError(null);
    try {
      const res = await fetch("/api/system/update", { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? "Update fehlgeschlagen");
      } else {
        setConfirming(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setTriggering(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-ink-subtle">Versions-Info wird geladen…</p>
      </Card>
    );
  }

  if (!version) {
    return (
      <Card>
        <p className="text-sm text-rose-300">Konnte Version nicht laden. {error}</p>
      </Card>
    );
  }

  const isRunning = status?.active || version.updateInProgress;
  const isDone = status?.step === "done" && !status?.active;
  const isError = status?.step === "error";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-ink">Version</h3>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="text-ink-muted">
              Du läufst auf{" "}
              <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono text-[12px] text-ink">
                {version.current.short ?? "unbekannt"}
              </code>
            </span>
            {version.upToDate === true && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <Dot /> Aktuell
              </span>
            )}
            {version.upToDate === false && version.behindCount !== null && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                <Dot warn /> {version.behindCount} Commit
                {version.behindCount === 1 ? "" : "s"} hinter{" "}
                <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono text-[11px]">
                  {version.latest!.short}
                </code>
              </span>
            )}
            {!version.latest && version.latestError && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                <Dot warn /> Versions-Check nicht möglich: {version.latestError}
              </span>
            )}
          </div>
          {version.latest && (
            <div className="mt-2 text-xs text-ink-subtle">
              Letzter Commit:{" "}
              <a
                href={version.latest.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                {version.latest.message}
              </a>
              {" · "}
              {new Date(version.latest.date).toLocaleString("de-DE")}
            </div>
          )}
        </div>

        {/* Action-Button */}
        {isRunning ? (
          <button
            type="button"
            disabled
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-line bg-bg-elevated px-3.5 py-2 text-sm font-medium text-ink-muted"
          >
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" />
            Update läuft…
          </button>
        ) : version.upToDate === false && version.canUpdate ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-bg-base hover:bg-white"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
            </svg>
            Update installieren
          </button>
        ) : version.inDocker && version.upToDate === false ? (
          <span className="shrink-0 text-xs text-ink-subtle">
            Docker — siehe Hinweis unten
          </span>
        ) : null}
      </div>

      {/* Docker-Hinweis */}
      {version.inDocker && version.upToDate === false && (
        <div className="mt-4 rounded-md border border-line bg-bg-elevated/40 p-3 text-xs">
          <div className="font-medium text-ink">Update via Docker</div>
          <p className="mt-1 text-ink-muted">
            Container-basierte Setups updaten sich nicht selbst. Führ auf dem Host aus:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-bg-base p-2 font-mono text-[11px] text-ink">
            git pull && docker compose build && docker compose up -d
          </pre>
        </div>
      )}

      {/* Reason warum nicht updatable */}
      {!version.canUpdate && !version.inDocker && version.reason && version.upToDate === false && (
        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          ⚠ {version.reason}
        </div>
      )}

      {/* Progress wenn aktiv oder gerade fertig */}
      {(isRunning || (status && status.startedAt)) && (
        <div className="mt-5 border-t border-line pt-4">
          <ProgressBar currentStep={status?.step ?? "start"} isError={!!isError} />
          {status?.step && (
            <div className="mt-2 flex items-baseline justify-between text-xs">
              <span className="text-ink-muted">
                {STEP_LABELS[status.step] ?? status.step}
                {isDone && " · Bot startet gleich neu"}
              </span>
              {status.startedAt && (
                <span className="text-ink-subtle tabular-nums">
                  gestartet {formatRelative(status.startedAt)}
                </span>
              )}
            </div>
          )}
          {status?.error && (
            <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <div className="font-medium">Fehler</div>
              <div className="mt-1 font-mono">{status.error}</div>
            </div>
          )}
          {isDone && (
            <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              ✓ Update erfolgreich. Bot wird neu gestartet — diese Seite refresht
              sich automatisch sobald er wieder online ist.
            </div>
          )}
          {status?.log && status.log.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-ink-subtle hover:text-ink">
                Log ({status.log.length} Zeilen)
              </summary>
              <pre className="mt-2 max-h-48 overflow-y-auto rounded bg-bg-base p-2 font-mono text-[11px] text-ink-muted">
                {status.log.join("\n")}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Confirm-Dialog */}
      {confirming && (
        <ConfirmDialog
          onCancel={() => setConfirming(false)}
          onConfirm={triggerUpdate}
          pending={triggering}
          version={version}
          error={error}
        />
      )}
    </Card>
  );
}

function ProgressBar({ currentStep, isError }: { currentStep: string; isError: boolean }) {
  const visible = STEP_ORDER.filter((s) => s !== "done");
  const currentIdx = currentStep === "done" ? visible.length : visible.indexOf(currentStep);
  const ratio = currentStep === "done" ? 1 : Math.max(0, currentIdx) / visible.length;

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
      <div
        className={`h-full rounded-full transition-all ${
          isError
            ? "bg-rose-400"
            : currentStep === "done"
              ? "bg-emerald-400"
              : "bg-brand"
        }`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

function ConfirmDialog({
  onCancel,
  onConfirm,
  pending,
  version,
  error,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  version: VersionInfo;
  error: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-line bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">Update jetzt installieren?</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Der Bot wird kurz offline gehen, während Build und Restart laufen
          (typisch 30–90 Sekunden). Bei Fehlern wird automatisch auf den
          vorherigen Stand zurückgesetzt.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-ink-subtle">
          <li>
            • Von{" "}
            <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono">
              {version.current.short}
            </code>{" "}
            → <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono">{version.latest?.short}</code>
          </li>
          <li>
            • {version.behindCount} Commit{version.behindCount === 1 ? "" : "s"} werden gezogen
          </li>
          <li>• DB wird vor dem Update gesichert</li>
        </ul>

        {error && (
          <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-1.5 text-sm font-medium text-bg-base hover:bg-white disabled:opacity-50"
          >
            {pending && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-bg-base border-t-transparent" />
            )}
            Update starten
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-bg-card p-5">{children}</section>
  );
}

function Dot({ warn }: { warn?: boolean }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${
        warn ? "bg-amber-400" : "bg-emerald-400"
      }`}
    />
  );
}
