import Link from "next/link";

interface ModuleCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  enabled: boolean;
}

/** Kompakte Modul-Zeile: neutrales Icon, Status rechts — Farbe nur als Bedeutung. */
export function ModuleCard({ title, description, href, icon, enabled }: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-line bg-bg-card p-4 transition-colors hover:border-line-strong hover:bg-bg-elevated"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-ink-muted transition-colors group-hover:text-ink">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{title}</h3>
        <p className="truncate text-xs text-ink-muted">{description}</p>
      </div>
      <span
        className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${
          enabled ? "text-emerald-400" : "text-ink-subtle"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-ink-subtle/60"}`}
        />
        {enabled ? "Aktiv" : "Aus"}
      </span>
    </Link>
  );
}
