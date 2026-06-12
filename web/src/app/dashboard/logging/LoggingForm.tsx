"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { saveLoggingSettings } from "./actions";

interface Initial {
  logChannelId: string | null;
  logMessageDelete: boolean;
  logMessageEdit: boolean;
  logMemberJoin: boolean;
  logMemberLeave: boolean;
  logMemberBan: boolean;
  logMemberUnban: boolean;
  logMemberNickname: boolean;
  logMemberRoles: boolean;
  logVoice: boolean;
  logModeration: boolean;
  logChannels: boolean;
  logServerRoles: boolean;
  logServer: boolean;
  logInvites: boolean;
  logEmojis: boolean;
  recordModEvents: boolean;
}

type Key = keyof Omit<Initial, "logChannelId" | "recordModEvents">;

interface Category {
  key: Key;
  label: string;
  description: string;
  icon: ReactNode;
}

interface Group {
  title: string;
  categories: Category[];
}

const GROUPS: Group[] = [
  {
    title: "Nachrichten",
    categories: [
      {
        key: "logMessageDelete",
        label: "Nachricht gelöscht",
        description: "Loggt gelöschte Nachrichten (außer von Bots).",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M3 6h18" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        ),
      },
      {
        key: "logMessageEdit",
        label: "Nachricht bearbeitet",
        description: "Mit Vorher-/Nachher-Inhalt.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Mitglieder",
    categories: [
      {
        key: "logMemberJoin",
        label: "Beigetreten",
        description: "Inklusive Account-Alter.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6M23 11h-6" />
          </svg>
        ),
      },
      {
        key: "logMemberLeave",
        label: "Verlassen",
        description: "Mit Rollen und Beitrittsdatum.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M17 8l5 5M22 8l-5 5" />
          </svg>
        ),
      },
      {
        key: "logMemberNickname",
        label: "Nickname geändert",
        description: "Vorher- und Nachher-Name.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M4 7V4h16v3M9 20h6M12 4v16" />
          </svg>
        ),
      },
      {
        key: "logMemberRoles",
        label: "Rollen geändert",
        description: "Welche Rollen hinzukommen oder weggehen.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M20.59 13.41a2 2 0 0 1 0 2.83l-5.66 5.66a2 2 0 0 1-2.83 0L2.5 12.3V2.5h9.8l8.29 8.29a2 2 0 0 1 0 2.62z" />
            <circle cx="7" cy="7" r="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Moderation & Sicherheit",
    categories: [
      {
        key: "logMemberBan",
        label: "Ban gesetzt",
        description: "Mit Grund (falls angegeben).",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="12" cy="12" r="10" />
            <path d="m4.93 4.93 14.14 14.14" />
          </svg>
        ),
      },
      {
        key: "logMemberUnban",
        label: "Ban aufgehoben",
        description: "Wenn jemand entbannt wird.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        ),
      },
      {
        key: "logModeration",
        label: "Mod-Aktionen",
        description: "Kick, Timeout, Warn, Move, Disconnect — mit Moderator + Grund.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Voice",
    categories: [
      {
        key: "logVoice",
        label: "Voice-Aktivität",
        description: "Beitreten, Verlassen und Wechseln zwischen Voice-Channels.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Server",
    categories: [
      {
        key: "logChannels",
        label: "Channels & Threads",
        description: "Erstellt, gelöscht, geändert (Name, Topic, Slowmode …).",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
          </svg>
        ),
      },
      {
        key: "logServerRoles",
        label: "Server-Rollen",
        description: "Rollen erstellt, gelöscht, geändert — inkl. Berechtigungen.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18M3 12h18" />
          </svg>
        ),
      },
      {
        key: "logServer",
        label: "Server-Einstellungen",
        description: "Name, Icon, Banner, AFK- und System-Channel.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
          </svg>
        ),
      },
      {
        key: "logInvites",
        label: "Invites",
        description: "Einladungen erstellt und gelöscht — mit Ersteller und Ablauf.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        ),
      },
      {
        key: "logEmojis",
        label: "Emojis & Sticker",
        description: "Hinzugefügt, entfernt und umbenannt.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <path d="M9 9h.01M15 9h.01" />
          </svg>
        ),
      },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.categories.map((c) => c.key));

export function LoggingForm({
  initial,
  channels,
}: {
  initial: Initial;
  channels: ChannelOption[];
}) {
  const [channelId, setChannelId] = useState(initial.logChannelId ?? "");
  const [recordModEvents, setRecordModEvents] = useState(initial.recordModEvents);
  const [states, setStates] = useState<Record<Key, boolean>>(() => {
    const o = {} as Record<Key, boolean>;
    for (const k of ALL_KEYS) o[k] = Boolean(initial[k]);
    return o;
  });
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCount = useMemo(() => Object.values(states).filter(Boolean).length, [states]);
  const totalCount = ALL_KEYS.length;
  const channelSet = Boolean(channelId);
  const allActive = activeCount === totalCount;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveLoggingSettings(formData);
      setFeedback(
        result.ok
          ? { kind: "ok", msg: "Gespeichert." }
          : { kind: "error", msg: result.error },
      );
    });
  };

  const toggleAll = (target: boolean) => {
    const next: Record<Key, boolean> = {} as Record<Key, boolean>;
    for (const k of ALL_KEYS) next[k] = target;
    setStates(next);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Hero: Status + Channel-Picker */}
      <div
        className={`relative rounded-2xl border p-6 ${
          channelSet
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-bg-card"
            : "border-line bg-bg-elevated/40"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                channelSet
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-zinc-500/15 text-zinc-400"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-ink">Audit-Logging</div>
              <div className="text-xs text-ink-muted">
                {channelSet ? (
                  <>
                    <span className="text-emerald-400">{activeCount}</span> von {totalCount}{" "}
                    Kategorien aktiv
                  </>
                ) : (
                  "Inaktiv — kein Log-Channel ausgewählt"
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-sm font-medium text-ink">Log-Channel</label>
          <ChannelPicker
            name="logChannelId"
            defaultValue={initial.logChannelId}
            value={channelId}
            channels={channels}
            allowedTypes={[0, 5]}
            placeholder="Keinen — Logging aus"
            onChange={(v) => setChannelId(v)}
          />
          <p className="mt-1.5 text-xs text-ink-subtle">
            In welchen Text-Channel der Bot Audit-Events postet.
          </p>
        </div>
      </div>

      {/* Kategorien */}
      <div className={channelSet ? "" : "pointer-events-none opacity-40"}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Was geloggt wird
          </span>
          <button
            type="button"
            onClick={() => toggleAll(!allActive)}
            className="text-xs font-medium text-brand hover:opacity-80"
          >
            {allActive ? "Alle deaktivieren" : "Alle aktivieren"}
          </button>
        </div>

        <div className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle/80">
                {group.title}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.categories.map((cat) => {
                  const on = states[cat.key];
                  return (
                    <label
                      key={cat.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        on
                          ? "border-brand/30 bg-brand/[0.04]"
                          : "border-line bg-bg-elevated/40 hover:border-line-strong"
                      }`}
                    >
                      <div
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                          on
                            ? "bg-brand/15 text-brand"
                            : "bg-bg-elevated text-ink-subtle"
                        }`}
                      >
                        {cat.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-ink">{cat.label}</div>
                        <div className="mt-0.5 text-xs text-ink-muted">{cat.description}</div>
                      </div>
                      <input
                        type="checkbox"
                        name={cat.key}
                        checked={on}
                        onChange={(e) =>
                          setStates((s) => ({ ...s, [cat.key]: e.target.checked }))
                        }
                        className="peer/c sr-only"
                      />
                      <span
                        className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors ${
                          on ? "bg-brand-gradient" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            on ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard-Verlauf — unabhängig vom Log-Channel, deshalb außerhalb
          des deaktivierten Kategorien-Blocks */}
      <div className="rounded-2xl border border-line bg-bg-elevated/40 p-5">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">Mod-Aktionen-Verlauf (Dashboard)</div>
            <p className="mt-0.5 text-xs text-ink-muted">
              Zeichnet Kicks, Timeouts, Voice-Moves und -Disconnects für den
              „Aktionen"-Tab auf der Moderations-Seite auf — funktioniert auch ohne
              Log-Channel und unabhängig von den Kategorien oben.
            </p>
          </div>
          <input
            type="checkbox"
            name="recordModEvents"
            checked={recordModEvents}
            onChange={(e) => setRecordModEvents(e.target.checked)}
            className="sr-only"
          />
          <span
            className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors ${
              recordModEvents ? "bg-brand-gradient" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                recordModEvents ? "translate-x-4" : ""
              }`}
            />
          </span>
        </label>
      </div>

      {/* Sticky Save-Bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border border-line bg-bg-card/95 px-5 py-3 shadow-card-lg backdrop-blur">
        <span className="text-xs text-ink-subtle">
          {channelSet
            ? `Bot loggt nach #${channels.find((c) => c.channelId === channelId)?.name ?? "?"}`
            : "Wähle einen Channel, damit Logging aktiv wird."}
        </span>
        <div className="flex items-center gap-3">
          {feedback && (
            <span
              className={`text-sm ${
                feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {feedback.msg}
            </span>
          )}
          <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
            {isPending ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>

    </form>
  );
}
