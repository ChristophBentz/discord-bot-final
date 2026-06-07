// In-Memory-Ringbuffer für die letzten Errors + Scheduler-Status.
// Wird vom Logger gepushed und vom /api/system/health-Endpoint gelesen.
// Beim Bot-Neustart leer — bewusst, weil Health-View nur „seit letztem Start".

const MAX_ERRORS = 50;

export interface LogEntry {
  ts: string; // ISO
  level: "error" | "warn";
  msg: string;
  context?: Record<string, unknown>;
}

const errorBuffer: LogEntry[] = [];

export function recordLog(
  level: "error" | "warn",
  msg: string,
  context?: Record<string, unknown>,
): void {
  errorBuffer.push({ ts: new Date().toISOString(), level, msg, context });
  if (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();
}

export function getRecentLogs(): LogEntry[] {
  return [...errorBuffer].reverse(); // neueste zuerst
}

// ─── Scheduler-Status ──────────────────────────────────────────────────────

export interface SchedulerStatus {
  name: string;
  lastRunAt: string | null; // ISO
  lastResult: string | null; // freie Beschreibung
  intervalMs: number | null;
  ok: boolean;
}

const schedulers = new Map<string, SchedulerStatus>();

export function registerScheduler(name: string, intervalMs: number | null): void {
  if (schedulers.has(name)) return;
  schedulers.set(name, {
    name,
    lastRunAt: null,
    lastResult: null,
    intervalMs,
    ok: true,
  });
}

export function recordSchedulerRun(
  name: string,
  result: { ok: boolean; details?: string },
): void {
  const existing = schedulers.get(name) ?? {
    name,
    lastRunAt: null,
    lastResult: null,
    intervalMs: null,
    ok: true,
  };
  existing.lastRunAt = new Date().toISOString();
  existing.lastResult = result.details ?? (result.ok ? "ok" : "fehler");
  existing.ok = result.ok;
  schedulers.set(name, existing);
}

export function getSchedulerStatuses(): SchedulerStatus[] {
  return Array.from(schedulers.values()).sort((a, b) => a.name.localeCompare(b.name));
}
