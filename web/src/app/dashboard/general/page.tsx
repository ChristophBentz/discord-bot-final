import { getConfig } from "@repo/db";
import { BotStatusForm } from "./BotStatusForm";
import { BotIdentityForm } from "./BotIdentityForm";
import { loadBotDescription } from "./actions";

export default async function GeneralPage() {
  const [config, description] = await Promise.all([getConfig(), loadBotDescription()]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          Einstellungen
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Allgemein</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Globale Bot-Einstellungen — wie der Bot auf eurem Discord aussieht und sich verhält.
        </p>
      </header>

      <section className="card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Bot-Profil</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Avatar, Name und Beschreibung — so erscheint der Bot in Discord.
          </p>
        </div>
        <BotIdentityForm
          initialName={config.botName}
          initialAvatarUrl={config.botAvatarUrl}
          initialDescription={description}
        />
      </section>

      <section className="card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Status</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Custom-Status unter dem Bot-Namen in der Member-Liste.
          </p>
        </div>
        <BotStatusForm initial={config.botStatusText} />
      </section>
    </div>
  );
}
