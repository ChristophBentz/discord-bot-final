import Link from "next/link";

export type IconColor =
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "teal"
  | "blue"
  | "violet"
  | "pink"
  | "slate";

const ICON_CLASSES: Record<IconColor, string> = {
  red: "bg-icon-red-bg text-icon-red-fg",
  orange: "bg-icon-orange-bg text-icon-orange-fg",
  amber: "bg-icon-amber-bg text-icon-amber-fg",
  green: "bg-icon-green-bg text-icon-green-fg",
  teal: "bg-icon-teal-bg text-icon-teal-fg",
  blue: "bg-icon-blue-bg text-icon-blue-fg",
  violet: "bg-icon-violet-bg text-icon-violet-fg",
  pink: "bg-icon-pink-bg text-icon-pink-fg",
  slate: "bg-icon-slate-bg text-icon-slate-fg",
};

interface ModuleCardProps {
  title: string;
  description: string;
  href?: string;
  iconColor: IconColor;
  icon: React.ReactNode;
  enabled: boolean;
  badge?: string;
  soon?: boolean;
}

export function ModuleCard({
  title,
  description,
  href,
  iconColor,
  icon,
  enabled,
  badge,
  soon = false,
}: ModuleCardProps) {
  const content = (
    <div
      className={`group relative flex h-full flex-col gap-4 rounded-2xl border border-line bg-bg-card p-5 transition-all ${
        soon ? "opacity-60" : "hover:border-line-strong hover:bg-bg-elevated"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${ICON_CLASSES[iconColor]}`}>
          {icon}
        </div>
        {/* Toggle-Indikator (visual only) */}
        <div
          className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors ${
            enabled ? "bg-brand-gradient" : "bg-bg-elevated"
          }`}
        >
          <div
            className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-snug text-ink-muted">{description}</p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        {badge ? (
          <span className="badge">{badge}</span>
        ) : soon ? (
          <span className="badge">Bald verfügbar</span>
        ) : (
          <span className={`badge ${enabled ? "border-emerald-500/20 text-emerald-400" : ""}`}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-ink-subtle"}`}
            />
            {enabled ? "Konfiguriert" : "Nicht konfiguriert"}
          </span>
        )}
        {!soon && (
          <span className="text-sm font-medium text-ink-muted transition-colors group-hover:text-brand">
            Konfigurieren →
          </span>
        )}
      </div>
    </div>
  );

  if (soon || !href) return content;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
