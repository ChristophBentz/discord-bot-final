"use client";

import { useEffect } from "react";

interface Feature {
  name: string;
  desc: string;
}

interface Group {
  title: string;
  features: Feature[];
}

const GROUPS: Group[] = [
  {
    title: "Moderation & Sicherheit",
    features: [
      {
        name: "Moderation",
        desc: "Warnungen, Timeouts, Kicks und Bans direkt aus dem Dashboard — mit Logbuch pro User.",
      },
      {
        name: "AutoMod",
        desc: "Automatische Filter für Spam, Mass-Mentions und Discord-Einladungen. Whitelist-Channels und Bypass-Rollen konfigurierbar.",
      },
      {
        name: "Logging",
        desc: "Server-Events (gelöschte Nachrichten, Member-Join/-Leave, Voice-Aktivität, Bans …) protokollieren.",
      },
    ],
  },
  {
    title: "Engagement",
    features: [
      {
        name: "Welcome",
        desc: "Begrüßung neuer Mitglieder mit anpassbarer Nachricht und Auto-Rollen.",
      },
      {
        name: "Leveling",
        desc: "XP für Nachrichten und Voice. Geometrische Level-Kurve, anpassbare Level-Up-Nachricht.",
      },
      {
        name: "Achievements",
        desc: "Auszeichnungen die User für bestimmte Aktivitäten freischalten — manuell oder automatisch vergebbar.",
      },
      {
        name: "Server-Stats",
        desc: "Locked-Voice-Channels mit Live-Counter (Mitglieder, ohne Bots, Online). Update alle 5-60 Min.",
      },
      {
        name: "Auto-Rollen",
        desc: "Self-Assign-Panels mit Reactions, Buttons oder Dropdown. User wählt sich seine Rollen selbst.",
      },
    ],
  },
  {
    title: "Utility",
    features: [
      {
        name: "Temp-Channels",
        desc: "Join-to-Create Voice: User joinen einen Trigger-Channel und bekommen einen eigenen Voice-Channel mit vollen Owner-Rechten.",
      },
      {
        name: "Tickets",
        desc: "User öffnen Support-Tickets über einen Button, du beantwortest sie im Dashboard. Mit Transkripten und Bewertungen.",
      },
      {
        name: "Musik",
        desc: "Voice-Channel-Musik via yt-dlp. Steuerbar aus dem Dashboard (Play/Pause/Skip/Lautstärke).",
      },
      {
        name: "Free Games",
        desc: "Postet kostenlose Spiele (Epic, Steam, GOG, Konsolen) automatisch via GamerPower-API.",
      },
      {
        name: "RSS-Feeds",
        desc: "Beliebige RSS/Atom-Feeds in Discord-Channels posten — News, Blogs, YouTube, Reddit.",
      },
      {
        name: "Nachrichten",
        desc: "Sende Text, Embeds, Umfragen oder Datei-Anhänge im Namen des Bots in beliebige Channels.",
      },
    ],
  },
  {
    title: "Übersicht & Daten",
    features: [
      {
        name: "Mitglieder",
        desc: "Volle Profilseiten mit Aktivitäts-Heatmap, Rollen, Moderationsverlauf, Achievements und Online-Status.",
      },
      {
        name: "Analytics",
        desc: "Server-weite Statistiken: Nachrichten- und Voice-Trends, Top-User, Channel-Aktivität, Heatmap.",
      },
    ],
  },
  {
    title: "Bedienung",
    features: [
      {
        name: "Globale Suche",
        desc: "⌘K (oder Ctrl+K) öffnet die Suche — findet Mitglieder, Channels und alle Dashboard-Seiten.",
      },
      {
        name: "Allgemein",
        desc: "Bot-Avatar, Server-Nickname und Beschreibung lassen sich hier ändern.",
      },
    ],
  },
];

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-line bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-brand">
              Hilfe
            </div>
            <h2 className="mt-1 text-xl font-semibold text-ink">Was kann der Bot?</h2>
            <p className="mt-1 text-sm text-ink-muted">
              All-in-One Discord-Bot mit Web-Dashboard. Hier eine Übersicht über alle Features.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-bg-elevated text-ink-muted transition-colors hover:bg-bg-hover hover:text-ink"
            title="Schließen"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {GROUPS.map((group) => (
              <section key={group.title}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.features.map((f) => (
                    <div
                      key={f.name}
                      className="rounded-xl border border-line bg-bg-elevated/40 p-3"
                    >
                      <div className="text-sm font-semibold text-ink">{f.name}</div>
                      <div className="mt-0.5 text-xs text-ink-muted">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line bg-bg-elevated/40 px-6 py-3 text-xs text-ink-subtle">
          <span>
            Tipp: <kbd className="rounded border border-line bg-bg-card px-1.5 py-0.5 text-[10px]">⌘K</kbd>{" "}
            für schnelle Navigation
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink"
          >
            Schließen (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
