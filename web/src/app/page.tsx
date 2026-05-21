import { LoginButton } from "@/components/LoginButton";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl space-y-10 text-center">
        <div className="space-y-4">
          <span className="pill-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Bot online
          </span>
          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
            Dein Discord-Bot.
            <br />
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              Einfach konfiguriert.
            </span>
          </h1>
          <p className="mx-auto max-w-lg text-pretty text-lg text-ink-muted">
            Moderation, Welcome-Messages, Leveling und mehr — alles bequem im Browser einstellbar.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <LoginButton />
          <p className="text-xs text-ink-subtle">
            Anmeldung nur für den Server-Owner möglich.
          </p>
        </div>
      </div>
    </main>
  );
}
