import { getConfig } from "@repo/db";
import { BotStatusForm } from "./BotStatusForm";
import { BotNicknameForm } from "./BotNicknameForm";

export default async function GeneralPage() {
  const config = await getConfig();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          Einstellungen
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Allgemein</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Globale Bot-Einstellungen.
        </p>
      </header>

      <section className="card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Bot-Name</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Der Server-Nickname des Bots. Wird in Discord überall angezeigt wo der Bot
            auftaucht (Mentions, Nachrichten, Member-Liste).
          </p>
        </div>
        <BotNicknameForm initial={config.botName} />
      </section>

      <section className="card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Bot-Status</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Wird in Discord als Custom Status unter dem Bot-Namen angezeigt.
          </p>
        </div>
        <BotStatusForm initial={config.botStatusText} />
      </section>
    </div>
  );
}
