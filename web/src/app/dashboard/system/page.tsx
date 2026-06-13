import { HealthClient } from "./HealthClient";
import { UpdateCard } from "./UpdateCard";

// Kein blockierender Server-Call mehr: HealthClient lädt sofort beim Mount selbst
// und pollt dann (mit Tab-Visibility-Pause). Spart bis zu 5s Render-Wartezeit.
export default function SystemPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          System
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Bot-Health</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Live-Status des Bots, Memory, Discord-Latenz, Scheduler-Runs,
          Updates und Errors seit letztem Restart.
        </p>
      </header>

      <UpdateCard />
      <HealthClient initial={null} />
    </div>
  );
}
