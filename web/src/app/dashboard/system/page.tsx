import { callBot } from "@/lib/botApi";
import { HealthClient, type HealthData } from "./HealthClient";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const res = await callBot<HealthData & { ok: true }>("/api/system/health", { method: "GET" });
  const initial = res.ok ? res.data : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          System
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Bot-Health</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Live-Status des Bots, Memory, Discord-Latenz, Scheduler-Runs und
          Errors seit letztem Restart. Refresh alle 5s.
        </p>
      </header>

      <HealthClient initial={initial} />
    </div>
  );
}
