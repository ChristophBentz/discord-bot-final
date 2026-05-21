import { callBot } from "@/lib/botApi";
import {
  BanList,
  TimeoutList,
  type BanEntry,
  type TimeoutEntry,
} from "./ModerationLists";

interface BotState {
  timeouts: TimeoutEntry[];
  bans: BanEntry[];
}

export default async function ModerationPage() {
  const res = await callBot<BotState>("/api/moderation/state", { method: "GET" });

  const timeouts = res.ok ? res.data.timeouts : [];
  const bans = res.ok ? res.data.bans : [];
  const error = res.ok ? null : res.error;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Server</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Moderation</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Aktive Timeouts und Bans. Aufheben mit einem Klick — wird automatisch im Log-Channel gepostet.
        </p>
      </header>

      {error && (
        <div className="card border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-400">
          Bot nicht erreichbar: {error}
        </div>
      )}

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aktive Timeouts</h2>
          <span className="badge">{timeouts.length}</span>
        </div>
        <TimeoutList items={timeouts} />
      </section>

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aktive Bans</h2>
          <span className="badge">{bans.length}</span>
        </div>
        <BanList items={bans} />
      </section>
    </div>
  );
}
