"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
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

export function AppearanceModal({ open, onClose, current }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);

  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);

  const valid = isHexColor(from) && isHexColor(to);
  const activePreset = ACCENT_PRESETS.find((p) => p.from === from && p.to === to);

  const save = () => {
    if (!valid) return;
    startTransition(async () => {
      const result = await saveAccentColor(from, to);
      if (!result.ok) {
        setFeedback({ kind: "error", msg: result.error });
        return;
      }
      // Sofort anwenden, ohne auf den Re-Render des Root-Layouts zu warten.
      const root = document.documentElement;
      root.style.setProperty("--accent-from", hexToTriplet(from));
      root.style.setProperty("--accent-to", hexToTriplet(to));
      setFeedback({ kind: "ok", msg: "Gespeichert — gilt für alle Dashboard-Nutzer." });
      router.refresh();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Einstellungen" width="sm">
      <div className="space-y-5">
        <div>
          <div className="text-sm font-medium">Akzentfarbe</div>
          <p className="mt-0.5 text-xs text-ink-muted">
            Gilt global für das ganze Dashboard und die öffentlichen Seiten.
          </p>

          {/* Presets */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {ACCENT_PRESETS.map((preset) => {
              const active = activePreset?.name === preset.name;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setFrom(preset.from);
                    setTo(preset.to);
                    setFeedback(null);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition-colors ${
                    active
                      ? "border-brand/60 bg-brand-subtle"
                      : "border-line bg-bg-elevated hover:bg-bg-hover"
                  }`}
                >
                  <span
                    className="h-6 w-6 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${preset.from} 0%, ${preset.to} 100%)`,
                    }}
                  />
                  <span className="text-[11px] font-medium text-ink-muted">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Eigener Wert */}
        <div>
          <div className="text-xs font-medium text-ink-muted">Eigener Verlauf</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(
              [
                ["Von", from, setFrom],
                ["Bis", to, setTo],
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

        {/* Live-Vorschau */}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-bg-elevated p-3">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-xs font-semibold text-white"
            style={{
              background: valid
                ? `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
                : undefined,
            }}
          >
            Aa
          </span>
          <span
            className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white"
            style={{
              background: valid
                ? `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
                : undefined,
            }}
          >
            Vorschau-Button
          </span>
        </div>

        {feedback && (
          <p
            className={`text-xs font-medium ${
              feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {feedback.msg}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setFrom(DEFAULT_ACCENT.from);
              setTo(DEFAULT_ACCENT.to);
              setFeedback(null);
            }}
            className="text-xs font-medium text-ink-subtle transition-colors hover:text-ink"
          >
            Auf Standard zurücksetzen
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary !py-1.5 text-[13px]">
              Schließen
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!valid || isPending}
              className="btn-primary !py-1.5 text-[13px] disabled:opacity-50"
            >
              {isPending ? "Speichert …" : "Speichern"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
