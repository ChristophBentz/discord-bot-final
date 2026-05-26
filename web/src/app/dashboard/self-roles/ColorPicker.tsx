"use client";

import { useEffect, useRef, useState } from "react";

// Discord-Brand + häufige Embed-Farben (handverlesene Palette die zum
// Dark-Theme passt; alle haben ausreichend Sättigung und stehen sich
// klar voneinander ab).
const PRESETS: Array<{ name: string; value: string }> = [
  { name: "Brand", value: "#a855f7" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Lime", value: "#84cc16" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Pink", value: "#ec4899" },
  { name: "Slate", value: "#64748b" },
  { name: "Zinc", value: "#3f3f46" },
  { name: "White", value: "#ffffff" },
];

function normalizeHex(input: string): string {
  let v = input.trim().toLowerCase();
  if (!v.startsWith("#")) v = "#" + v;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    // Shorthand → expand
    v = "#" + v.slice(1).split("").map((c) => c + c).join("");
  }
  return v;
}

function isValidHex(v: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(v);
}

interface Props {
  name: string;
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ name, value, onChange, label = "Embed-Farbe" }: Props) {
  const normalized = normalizeHex(value);
  const valid = isValidHex(normalized);
  const display = valid ? normalized : "#a855f7";

  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(display);
  const popoverRef = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHexInput(display);
  }, [display]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const commit = (raw: string) => {
    const next = normalizeHex(raw);
    if (isValidHex(next)) onChange(next);
  };

  const isPresetMatch = (val: string) => val.toLowerCase() === display.toLowerCase();

  return (
    <div className="relative" ref={popoverRef}>
      <input type="hidden" name={name} value={display} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm shadow-inner transition-colors hover:border-line-strong"
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md ring-1 ring-line"
          style={{ background: display }}
        >
          <span className="sr-only">Aktuelle Farbe</span>
        </span>
        <span className="flex-1 text-left">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
            {label}
          </span>
          <span className="font-mono text-xs uppercase text-ink">{display}</span>
        </span>
        <svg className="h-3.5 w-3.5 text-ink-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-bg-elevated shadow-card-lg">
          {/* Aktuelle Farbe als großer Streifen */}
          <div className="relative h-14" style={{ background: display }}>
            <div className="absolute inset-0 flex items-end justify-between p-3">
              <span className="rounded-md bg-black/40 px-2 py-0.5 font-mono text-[11px] uppercase text-white backdrop-blur">
                {display}
              </span>
            </div>
          </div>

          {/* Preset-Palette */}
          <div className="p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
              Presets
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {PRESETS.map((p) => {
                const selected = isPresetMatch(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onChange(p.value)}
                    title={`${p.name} · ${p.value}`}
                    className={`relative aspect-square rounded-lg transition-transform hover:scale-110 ${
                      selected ? "ring-2 ring-white ring-offset-2 ring-offset-bg-elevated" : "ring-1 ring-line"
                    }`}
                    style={{ background: p.value }}
                  >
                    {selected && (
                      <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Hex + nativer Picker */}
          <div className="border-t border-line p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
              Custom
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => nativeRef.current?.click()}
                className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-line transition-transform hover:scale-105"
                style={{ background: display }}
                title="Farb-Wheel öffnen"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80 drop-shadow" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6" />
                </svg>
                <input
                  ref={nativeRef}
                  type="color"
                  value={display}
                  onChange={(e) => onChange(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </button>
              <div className="flex-1">
                <div className="flex items-center rounded-lg border border-line bg-bg-card">
                  <span className="pl-2.5 text-xs text-ink-subtle">#</span>
                  <input
                    value={hexInput.replace(/^#/, "")}
                    onChange={(e) => setHexInput("#" + e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
                    onBlur={() => commit(hexInput)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commit(hexInput);
                      }
                    }}
                    placeholder="RRGGBB"
                    maxLength={6}
                    className="flex-1 bg-transparent px-2 py-2 font-mono text-sm uppercase text-ink outline-none placeholder:text-ink-subtle"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
