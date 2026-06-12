"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { saveAccentColor } from "@/app/dashboard/appearanceActions";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  hexToTriplet,
  isHexColor,
  type Accent,
} from "@/lib/accent";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Aktuell gespeicherte Akzentfarbe (aus der Config) */
  current: Accent;
}

type Section = "appearance" | "account" | "about";

const SECTIONS: Array<{ key: Section; label: string; icon: React.ReactNode }> = [
  {
    key: "appearance",
    label: "Darstellung",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.8-.7 1.8-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1a1.7 1.7 0 0 1 1.7-1.7H17a5 5 0 0 0 5-5c0-4.4-4.5-9.4-10-9.4Z" />
      </svg>
    ),
  },
  {
    key: "account",
    label: "Konto",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-3.9 3.6-7 8-7s8 3.1 8 7" />
      </svg>
    ),
  },
  {
    key: "about",
    label: "Über",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
      </svg>
    ),
  },
];

export function SettingsModal({ open, onClose, current }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [section, setSection] = useState<Section>("appearance");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);

  // baseline = zuletzt gespeicherter Stand; dirty-Erkennung dagegen
  const [baseline, setBaseline] = useState<Accent>(current);
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);

  const valid = isHexColor(from) && isHexColor(to);
  const dirty = from !== baseline.from || to !== baseline.to;
  const activePreset = ACCENT_PRESETS.find((p) => p.from === from && p.to === to);
  const gradient = valid ? `linear-gradient(135deg, ${from} 0%, ${to} 100%)` : undefined;

  // Escape schließt, Body-Scroll sperren (wie Modal.tsx)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const pick = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    setFeedback(null);
  };

  const save = () => {
    if (!valid || !dirty) return;
    startTransition(async () => {
      const result = await saveAccentColor(from, to);
      if (!result.ok) {
        setFeedback({ kind: "error", msg: result.error });
        return;
      }
      const root = document.documentElement;
      root.style.setProperty("--accent-from", hexToTriplet(from));
      root.style.setProperty("--accent-to", hexToTriplet(to));
      setBaseline({ from, to });
      setFeedback({ kind: "ok", msg: "Gespeichert" });
      router.refresh();
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Einstellungen"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />

      {/* Panel — feste Höhe, damit der Dialog beim Sektionswechsel nicht springt */}
      <div className="card relative flex h-[600px] max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden !p-0">
        {/* Kopfzeile */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold">Einstellungen</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-bg-hover hover:text-ink"
            aria-label="Schließen"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Körper: Navigation + Inhalt */}
        <div className="flex min-h-0 flex-1">
          <nav className="w-44 shrink-0 space-y-0.5 border-r border-line p-3">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  section === s.key
                    ? "bg-bg-elevated text-ink"
                    : "text-ink-muted hover:bg-bg-hover hover:text-ink"
                }`}
              >
                <span className={section === s.key ? "text-brand" : "text-ink-subtle"}>
                  {s.icon}
                </span>
                {s.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-6">
            {section === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold">Akzentfarbe</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Gilt global — für alle Dashboard-Nutzer und die öffentlichen Seiten.
                  </p>
                </div>

                {/* Presets */}
                <div className="grid grid-cols-4 gap-2">
                  {ACCENT_PRESETS.map((preset) => {
                    const active = activePreset?.name === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => pick(preset.from, preset.to)}
                        className={`group relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors ${
                          active
                            ? "border-brand/60 bg-brand-subtle"
                            : "border-line bg-bg-elevated hover:border-line-strong hover:bg-bg-hover"
                        }`}
                      >
                        <span
                          className="h-7 w-7 rounded-full"
                          style={{
                            background: `linear-gradient(135deg, ${preset.from} 0%, ${preset.to} 100%)`,
                          }}
                        />
                        <span className="text-[11px] font-medium text-ink-muted">
                          {preset.name}
                        </span>
                        {active && (
                          <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-brand text-white">
                            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 13 4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Eigener Verlauf */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                    Eigener Verlauf
                  </h4>
                  <div className="mt-2.5 grid grid-cols-2 gap-3">
                    {(
                      [
                        ["Start", from, setFrom],
                        ["Ende", to, setTo],
                      ] as const
                    ).map(([label, value, setValue]) => (
                      <label key={label} className="block">
                        <span className="mb-1 block text-[11px] text-ink-subtle">{label}</span>
                        <span className="flex items-center gap-2">
                          <input
                            type="color"
                            value={isHexColor(value) ? value : DEFAULT_ACCENT.from}
                            onChange={(e) => {
                              setValue(e.target.value);
                              setFeedback(null);
                            }}
                            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-line bg-bg-elevated p-1"
                            aria-label={`${label}-Farbe wählen`}
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              setValue(e.target.value.trim());
                              setFeedback(null);
                            }}
                            placeholder="#a855f7"
                            className="input !py-2 font-mono text-xs"
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                  {!valid && (
                    <p className="mt-2 text-xs text-rose-400">
                      Hex-Format #rrggbb erwartet, z.B. #a855f7.
                    </p>
                  )}
                </div>

                {/* Vorschau */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                    Vorschau
                  </h4>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg-elevated p-4">
                    <span
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                      style={{ background: gradient }}
                    >
                      Primär-Button
                    </span>
                    <span
                      className="relative inline-flex h-6 w-11 items-center rounded-full"
                      style={{ background: gradient }}
                    >
                      <span className="inline-block h-5 w-5 translate-x-[22px] rounded-full bg-white shadow" />
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                      style={{ background: gradient }}
                    >
                      Badge
                    </span>
                    <span
                      className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold text-white"
                      style={{ background: gradient }}
                    >
                      MS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {section === "account" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold">Konto</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Angemeldet über Discord OAuth.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-line bg-bg-elevated p-4">
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-11 w-11 rounded-full ring-2 ring-bg-card"
                    />
                  ) : (
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                      {(session?.user?.name ?? "U")[0]?.toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {session?.user?.name ?? "Unbekannt"}
                    </div>
                    <div className="truncate text-xs text-ink-muted">Discord-Konto</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="btn-secondary !py-1.5 text-[13px]"
                  >
                    Abmelden
                  </button>
                </div>

                <p className="text-xs leading-relaxed text-ink-subtle">
                  Zugriff auf das Dashboard haben Mitglieder mit Moderations-Berechtigung
                  (Administrator, Kick, Ban oder Timeout) auf dem konfigurierten Server.
                  Berechtigungen werden bei jedem Seitenaufruf neu geprüft.
                </p>
              </div>
            )}

            {section === "about" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold">Über</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    All-in-One Discord-Bot mit Web-Dashboard — selbst gehostet.
                  </p>
                </div>

                <dl className="divide-y divide-line rounded-xl border border-line bg-bg-elevated">
                  <div className="flex items-center justify-between px-4 py-3">
                    <dt className="text-xs text-ink-muted">Entwickler</dt>
                    <dd className="text-xs font-medium">
                      <a
                        href="https://moser-dev.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline"
                      >
                        moser-dev.com
                      </a>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <dt className="text-xs text-ink-muted">Status &amp; Logs</dt>
                    <dd className="text-xs font-medium">
                      <a href="/dashboard/system" className="text-brand hover:underline">
                        Bot-Health öffnen
                      </a>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <dt className="text-xs text-ink-muted">Lizenz</dt>
                    <dd className="text-xs font-medium text-ink-muted">MIT</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Fußzeile — immer sichtbar, damit die Geometrie konstant bleibt;
            Speichern-Aktionen nur in der Darstellung */}
        <div className="flex items-center justify-between gap-3 border-t border-line bg-bg-raised/50 px-5 py-3">
          <span
            className={`text-xs ${
              feedback
                ? feedback.kind === "ok"
                  ? "text-emerald-400"
                  : "text-rose-400"
                : "text-ink-subtle"
            }`}
          >
            {section === "appearance"
              ? feedback
                ? feedback.msg
                : dirty
                  ? "Ungespeicherte Änderungen"
                  : ""
              : ""}
          </span>
          {section === "appearance" ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => pick(DEFAULT_ACCENT.from, DEFAULT_ACCENT.to)}
                className="btn-secondary !py-1.5 text-[13px]"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!valid || !dirty || isPending}
                className="btn-primary !py-1.5 text-[13px] disabled:opacity-50"
              >
                {isPending ? "Speichert …" : "Speichern"}
              </button>
            </div>
          ) : (
            <button type="button" onClick={onClose} className="btn-secondary !py-1.5 text-[13px]">
              Schließen
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
