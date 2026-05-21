interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  hintTone?: "neutral" | "positive" | "negative";
  iconColor?: "violet" | "blue" | "pink" | "green" | "amber";
}

const ICON_BG: Record<NonNullable<StatCardProps["iconColor"]>, string> = {
  violet: "bg-icon-violet-bg text-icon-violet-fg",
  blue: "bg-icon-blue-bg text-icon-blue-fg",
  pink: "bg-icon-pink-bg text-icon-pink-fg",
  green: "bg-icon-green-bg text-icon-green-fg",
  amber: "bg-icon-amber-bg text-icon-amber-fg",
};

export function StatCard({
  label,
  value,
  hint,
  hintTone = "neutral",
  iconColor = "violet",
  children,
}: StatCardProps & { children?: React.ReactNode }) {
  const toneClass = {
    neutral: "text-ink-muted",
    positive: "text-emerald-400",
    negative: "text-rose-400",
  }[hintTone];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
          {label}
        </div>
        {children && (
          <div className={`grid h-7 w-7 place-items-center rounded-lg ${ICON_BG[iconColor]}`}>
            {children}
          </div>
        )}
      </div>
      <div className="mt-3 truncate text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && (
        <div className={`mt-1.5 text-xs font-medium ${toneClass}`}>{hint}</div>
      )}
    </div>
  );
}
