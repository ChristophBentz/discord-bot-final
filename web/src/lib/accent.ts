/**
 * Dashboard-Akzentfarbe: Gradient-Paar (from → to), global in Config gespeichert.
 * Geteilt zwischen Root-Layout (SSR-Injektion als CSS-Variablen), Server-Action
 * und Einstellungs-Modal.
 */

export interface Accent {
  from: string;
  to: string;
}

export const DEFAULT_ACCENT: Accent = { from: "#a855f7", to: "#ec4899" };

export const ACCENT_PRESETS: Array<Accent & { name: string }> = [
  { name: "Violet", ...DEFAULT_ACCENT },
  { name: "Indigo", from: "#6366f1", to: "#a855f7" },
  { name: "Blau", from: "#3b82f6", to: "#06b6d4" },
  { name: "Teal", from: "#14b8a6", to: "#0ea5e9" },
  { name: "Grün", from: "#10b981", to: "#84cc16" },
  { name: "Orange", from: "#f97316", to: "#fbbf24" },
  { name: "Rot", from: "#ef4444", to: "#f97316" },
  { name: "Pink", from: "#ec4899", to: "#f43f5e" },
];

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** "#a855f7" → "168 85 247" (für `rgb(var(--accent-from) / <alpha>)`) */
export function hexToTriplet(hex: string): string {
  const safe = isHexColor(hex) ? hex : DEFAULT_ACCENT.from;
  const n = parseInt(safe.slice(1), 16);
  return `${(n >> 16) & 0xff} ${(n >> 8) & 0xff} ${n & 0xff}`;
}

export function resolveAccent(from: string | null | undefined, to: string | null | undefined): Accent {
  return {
    from: from && isHexColor(from) ? from : DEFAULT_ACCENT.from,
    to: to && isHexColor(to) ? to : DEFAULT_ACCENT.to,
  };
}
