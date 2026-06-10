import { Suspense } from "react";
import { getConfig } from "@repo/db";
import { BotStatusForm } from "./BotStatusForm";
import { BotIdentityForm } from "./BotIdentityForm";
import { loadBotDescription } from "./actions";

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
        <Suspense fallback={<IdentitySkeleton />}>
          <IdentitySection
            initialName={config.botName}
            initialAvatarUrl={config.botAvatarUrl}
            initialBannerUrl={config.botBannerUrl}
          />
        </Suspense>
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

// Die Beschreibung kommt vom Bot via Discord-REST — streamen, statt die Navigation zu blockieren.
async function IdentitySection({
  initialName,
  initialAvatarUrl,
  initialBannerUrl,
}: {
  initialName: string | null;
  initialAvatarUrl: string | null;
  initialBannerUrl: string | null;
}) {
  const description = await loadBotDescription();
  return (
    <BotIdentityForm
      initialName={initialName}
      initialAvatarUrl={initialAvatarUrl}
      initialBannerUrl={initialBannerUrl}
      initialDescription={description}
    />
  );
}

function IdentitySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 w-24 rounded-full bg-bg-elevated" />
      <div className="h-10 rounded-xl bg-bg-elevated" />
      <div className="h-24 rounded-xl bg-bg-elevated" />
    </div>
  );
}
