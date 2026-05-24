import type { ReactNode } from "react";

interface Props {
  /** Icon links im Hero (16x16 SVG-Pfade) */
  icon: ReactNode;
  /** Großer Titel des Features */
  title: string;
  /** Kurze Status-Beschreibung — z.B. "Aktiv · 3 Begrüßungen pro Tag" */
  status: ReactNode;
  /** Wenn true → grüner Glow + emerald Tönung */
  active: boolean;
  /** Tönung wenn aktiv */
  tone?: "emerald" | "brand" | "amber" | "purple";
  /** Optionale Stat-Kacheln rechts (z.B. 3 KPIs) */
  stats?: Array<{ label: string; value: ReactNode; sublabel?: string }>;
  /** Optional: zusätzlicher Content unter dem Hero */
  children?: ReactNode;
}

const TONE_BG: Record<NonNullable<Props["tone"]>, string> = {
  emerald: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-bg-card",
  brand: "border-brand/30 bg-gradient-to-br from-brand/10 to-bg-card",
  amber: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-bg-card",
  purple: "border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-bg-card",
};
const TONE_ICON: Record<NonNullable<Props["tone"]>, string> = {
  emerald: "bg-emerald-500/20 text-emerald-400",
  brand: "bg-brand/20 text-brand-light",
  amber: "bg-amber-500/20 text-amber-400",
  purple: "bg-purple-500/20 text-purple-400",
};

export function FeatureHero({
  icon,
  title,
  status,
  active,
  tone = "emerald",
  stats,
  children,
}: Props) {
  const wrapClass = active ? TONE_BG[tone] : "border-line bg-bg-elevated/40";
  const iconClass = active ? TONE_ICON[tone] : "bg-zinc-500/15 text-zinc-400";

  return (
    <div className={`overflow-hidden rounded-2xl border ${wrapClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${iconClass}`}>
            {icon}
          </div>
          <div>
            <div className="text-base font-semibold text-ink">{title}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{status}</div>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.map((s, i) => (
              <div
                key={i}
                className="min-w-[100px] rounded-xl border border-line bg-bg-card/60 px-3 py-2"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                  {s.label}
                </div>
                <div className="mt-0.5 text-lg font-bold tabular-nums text-ink">{s.value}</div>
                {s.sublabel && (
                  <div className="text-[10px] text-ink-subtle">{s.sublabel}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
