"use client";

import { useState } from "react";
import { BanList, TimeoutList, type BanEntry, type TimeoutEntry } from "./ModerationLists";
import { WarningsList, type WarningEntry } from "./WarningsList";
import { AppealsList, type AppealEntry } from "./AppealsList";
import { ModEventsList, type ModEventEntry } from "./ModEventsList";

type TabKey = "timeouts" | "bans" | "appeals" | "warnings" | "actions";

interface Props {
  error: string | null;
  timeouts: TimeoutEntry[];
  bans: BanEntry[];
  appeals: AppealEntry[];
  warnings: WarningEntry[];
  modEvents: ModEventEntry[];
  /** Ist die Aufzeichnung (Audit Logs → Mod-Aktionen-Verlauf) aktiv? */
  modEventRecording: boolean;
}

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TONE = {
  amber: {
    active: "border-amber-500/40 bg-amber-500/[0.08]",
    icon: "bg-amber-500/15 text-amber-400",
    dot: "bg-amber-400",
  },
  rose: {
    active: "border-rose-500/40 bg-rose-500/[0.08]",
    icon: "bg-rose-500/15 text-rose-400",
    dot: "bg-rose-400",
  },
  emerald: {
    active: "border-emerald-500/40 bg-emerald-500/[0.08]",
    icon: "bg-emerald-500/15 text-emerald-400",
    dot: "bg-emerald-400",
  },
  purple: {
    active: "border-purple-500/40 bg-purple-500/[0.08]",
    icon: "bg-purple-500/15 text-purple-400",
    dot: "bg-purple-400",
  },
  blue: {
    active: "border-blue-500/40 bg-blue-500/[0.08]",
    icon: "bg-blue-500/15 text-blue-400",
    dot: "bg-blue-400",
  },
} as const;

export function ModerationTabs({
  error,
  timeouts,
  bans,
  appeals,
  warnings,
  modEvents,
  modEventRecording,
}: Props) {
  const openAppeals = appeals.filter((a) => a.status === "pending").length;

  const tabs: {
    key: TabKey;
    label: string;
    count: number;
    sub: string;
    tone: keyof typeof TONE;
    attention?: boolean;
    icon: React.ReactNode;
  }[] = [
    {
      key: "timeouts",
      label: "Timeouts",
      count: timeouts.length,
      sub: "aktiv",
      tone: "amber",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      ),
    },
    {
      key: "bans",
      label: "Bans",
      count: bans.length,
      sub: "aktiv",
      tone: "rose",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
          <circle cx="12" cy="12" r="10" />
          <path d="m4.93 4.93 14.14 14.14" />
        </svg>
      ),
    },
    {
      key: "appeals",
      label: "Anträge",
      count: openAppeals,
      sub: appeals.length === openAppeals ? "offen" : `offen · ${appeals.length} gesamt`,
      tone: "emerald",
      attention: openAppeals > 0,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
          <path d="M12 3v18M3 7h4l2 5H5l2-5h14l-2 5h-4l2-5" />
          <path d="M5 12a3 3 0 0 0 6 0M13 12a3 3 0 0 0 6 0" />
        </svg>
      ),
    },
    {
      key: "warnings",
      label: "Verwarnungen",
      count: warnings.length,
      sub: "letzte 50",
      tone: "purple",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      ),
    },
    {
      key: "actions",
      label: "Aktionen",
      count: modEvents.length,
      sub: "letzte 50",
      tone: "blue",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
  ];

  // Sinnvoller Start-Tab: offene Anträge zuerst, sonst der erste mit Inhalt.
  const defaultTab: TabKey =
    openAppeals > 0
      ? "appeals"
      : timeouts.length > 0
        ? "timeouts"
        : bans.length > 0
          ? "bans"
          : warnings.length > 0
            ? "warnings"
            : "timeouts";
  const [active, setActive] = useState<TabKey>(defaultTab);

  const PANEL: Record<TabKey, { title: string; description: string; body: React.ReactNode }> = {
    timeouts: {
      title: "Aktive Timeouts",
      description: "Laufen automatisch ab — oder hier vorzeitig aufheben.",
      body: <TimeoutList items={timeouts} />,
    },
    bans: {
      title: "Aktive Bans",
      description: "Aufheben entbannt sofort. Entscheidungen landen im Log-Channel.",
      body: <BanList items={bans} />,
    },
    appeals: {
      title: "Entbannungsanträge",
      description:
        "Gebannte stellen Anträge über den Link aus ihrer Ban-DM. Annehmen entbannt direkt und erzeugt einen Rejoin-Invite.",
      body: <AppealsList items={appeals} />,
    },
    warnings: {
      title: "Verwarnungen",
      description: "Letzte 50 — Klick auf einen User für Profil und vollständige Historie.",
      body: <WarningsList items={warnings} />,
    },
    actions: {
      title: "Mod-Aktionen",
      description:
        "Kicks, Timeouts, Voice-Moves und -Disconnects — auch wenn sie direkt in Discord ausgeführt wurden.",
      body: (
        <>
          {!modEventRecording && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              Aufzeichnung ist deaktiviert — neue Mod-Aktionen werden nicht gespeichert.
              Einschalten unter Audit Logs → „Mod-Aktionen-Verlauf". Bestehende Einträge
              bleiben hier sichtbar.
            </div>
          )}
          <ModEventsList items={modEvents} />
        </>
      ),
    },
  };
  const panel = PANEL[active];

  return (
    <>
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" {...stroke}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <div>
            <div className="font-semibold">Bot nicht erreichbar</div>
            <div className="mt-0.5 text-xs text-rose-300/80">{error}</div>
          </div>
        </div>
      )}

      {/* Stat-Kacheln = Tabs */}
      <div role="tablist" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tabs.map((tab) => {
          const tone = TONE[tab.tone];
          const isActive = active === tab.key;
          const isEmpty = tab.count === 0;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={`relative flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                isActive
                  ? tone.active
                  : "border-line bg-bg-elevated/40 hover:bg-bg-hover/60"
              }`}
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  isEmpty && !isActive ? "bg-zinc-500/10 text-zinc-400" : tone.icon
                }`}
              >
                {tab.icon}
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold tabular-nums text-ink">{tab.count}</div>
                <div className="truncate text-xs text-ink-muted">
                  {tab.label} <span className="text-ink-subtle">· {tab.sub}</span>
                </div>
              </div>
              {tab.attention && !isActive && (
                <span className={`absolute right-3 top-3 h-2 w-2 rounded-full ${tone.dot}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Aktives Panel */}
      <section role="tabpanel" className="card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{panel.title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{panel.description}</p>
        </div>
        {panel.body}
      </section>
    </>
  );
}
