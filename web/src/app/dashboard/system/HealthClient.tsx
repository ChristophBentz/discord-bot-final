"use client";

import { useEffect, useState } from "react";

export interface HealthData {
  bot: {
    uptimeMs: number;
    wsLatencyMs: number;
    ready: boolean;
    user: { tag: string; id: string } | null;
    guildCount: number;
  };
  process: {
    nodeVersion: string;
    platform: string;
    pid: number;
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  guild: {
    name: string | null;
    memberCount: number;
    cachedMembers: number;
    roleCount: number;
    channelCount: number;
  };
  db: {
    members: number;
    levelUsers: number;
    achievements: number;
    customCommands: number;
    warnings: number;
    tickets: number;
  };
  schedulers: {
    name: string;
    lastRunAt: string | null;
    lastResult: string | null;
    intervalMs: number | null;
    ok: boolean;
  }[];
  logs: {
    ts: string;
    level: "error" | "warn";
    msg: string;
    context?: Record<string, unknown>;
  }[];
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "noch nie";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `vor ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  return new Date(iso).toLocaleString("de-DE");
}

function latencyTone(ms: number): string {
  if (ms < 100) return "text-emerald-400";
  if (ms < 250) return "text-amber-400";
  return "text-rose-400";
}

export function HealthClient({ initial }: { initial: HealthData | null }) {
  const [data, setData] = useState<HealthData | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/system/health", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as HealthData;
        if (!cancelled) {
          setData(json);
          setLastUpdate(new Date());
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Fehler");
      }
    }
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!data) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
        Bot nicht erreichbar. {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status-Header */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-y border-line py-3 text-sm">
        <span className="flex items-center gap-2">
          <span
            className={`relative flex h-2 w-2`}
          >
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                data.bot.ready ? "bg-emerald-400 animate-ping opacity-75" : "bg-rose-400"
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                data.bot.ready ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
          </span>
          <span className="font-medium text-ink">
            {data.bot.ready ? "Online" : "Offline"}
          </span>
        </span>
        {data.bot.user && (
          <span className="text-ink-muted">{data.bot.user.tag}</span>
        )}
        <span className="text-ink-muted">
          Uptime{" "}
          <span className="font-medium text-ink tabular-nums">
            {formatUptime(data.bot.uptimeMs)}
          </span>
        </span>
        <span className="text-ink-muted">
          Latenz{" "}
          <span className={`font-medium tabular-nums ${latencyTone(data.bot.wsLatencyMs)}`}>
            {data.bot.wsLatencyMs}ms
          </span>
        </span>
        <span className="ml-auto text-[11px] text-ink-subtle">
          Aktualisiert {formatRelative(lastUpdate.toISOString())}{" "}
          {error && <span className="ml-2 text-rose-400">· {error}</span>}
        </span>
      </div>

      {/* Key-Metriken */}
      <Section title="System">
        <Grid>
          <Metric label="Memory (RSS)" value={`${data.process.rssMb} MB`} />
          <Metric
            label="Heap"
            value={`${data.process.heapUsedMb} / ${data.process.heapTotalMb} MB`}
            sub={`${Math.round((data.process.heapUsedMb / data.process.heapTotalMb) * 100)}%`}
          />
          <Metric label="Node" value={data.process.nodeVersion} mono />
          <Metric label="Platform" value={data.process.platform} mono />
        </Grid>
      </Section>

      {/* Guild */}
      <Section title="Guild">
        <Grid>
          <Metric label="Server" value={data.guild.name ?? "—"} />
          <Metric
            label="Members"
            value={data.guild.memberCount.toString()}
            sub={`${data.guild.cachedMembers} cached`}
          />
          <Metric label="Rollen" value={data.guild.roleCount.toString()} />
          <Metric label="Channels" value={data.guild.channelCount.toString()} />
        </Grid>
      </Section>

      {/* DB */}
      <Section title="Datenbank">
        <Grid>
          <Metric label="Members" value={data.db.members.toString()} />
          <Metric label="Level-User" value={data.db.levelUsers.toString()} />
          <Metric label="Achievements" value={data.db.achievements.toString()} />
          <Metric label="Custom-Cmds" value={data.db.customCommands.toString()} />
          <Metric label="Warnings" value={data.db.warnings.toString()} />
          <Metric label="Tickets" value={data.db.tickets.toString()} />
        </Grid>
      </Section>

      {/* Scheduler */}
      <Section title="Scheduler">
        {data.schedulers.length === 0 ? (
          <p className="text-sm text-ink-subtle">
            Noch keine Scheduler-Daten — feuern erst beim ersten Tick.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {data.schedulers.map((s) => (
              <li key={s.name} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    s.ok ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <span className="flex-1 text-sm font-medium text-ink">{s.name}</span>
                <span className="text-xs text-ink-muted">
                  {s.lastResult ?? "—"}
                </span>
                <span className="w-24 text-right text-xs text-ink-subtle tabular-nums">
                  {formatRelative(s.lastRunAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Logs */}
      <Section
        title={`Errors & Warnings (${data.logs.length})`}
        hint="Seit Bot-Start, max 50"
      >
        {data.logs.length === 0 ? (
          <p className="text-sm text-ink-subtle">
            Keine Errors oder Warnings seit Bot-Start. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {data.logs.map((log, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-px text-[10px] font-bold uppercase ${
                    log.level === "error"
                      ? "bg-rose-500/15 text-rose-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {log.level}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink">{log.msg}</div>
                  {log.context && Object.keys(log.context).length > 0 && (
                    <pre className="mt-1 truncate font-mono text-[11px] text-ink-subtle">
                      {JSON.stringify(log.context).slice(0, 200)}
                    </pre>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-ink-subtle tabular-nums">
                  {formatRelative(log.ts)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
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
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          {title}
        </h2>
        {hint && <span className="text-[11px] text-ink-subtle">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
  );
}

function Metric({
  label,
  value,
  sub,
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-bg-card px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
        {label}
      </div>
      <div
        className={`mt-1 truncate text-base font-semibold tabular-nums text-ink ${
          mono ? "font-mono text-sm" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-subtle">{sub}</div>}
    </div>
  );
}
