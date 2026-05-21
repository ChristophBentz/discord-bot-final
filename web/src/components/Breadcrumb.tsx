"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  general: "Allgemein",
  logging: "Audit Logs",
  moderation: "Moderation",
  welcome: "Welcome",
  leveling: "Leveling",
  tickets: "Tickets",
  commands: "Custom Commands",
  reactions: "Reaction Rolls",
  warnings: "Verwarnungen",
  music: "Musik",
  members: "Mitglieder",
  achievements: "Achievements",
  automod: "AutoMod",
  "temp-channels": "Temp-Channels",
};

export function Breadcrumb({ serverName }: { serverName: string }) {
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    href: "/" + segments.slice(0, i + 1).join("/"),
    label: LABELS[seg] ?? seg,
    last: i === segments.length - 1,
  }));

  return (
    <nav className="flex items-center gap-1.5 text-sm text-ink-muted">
      <span className="font-medium text-ink">{serverName}</span>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1.5">
          <span className="text-ink-subtle">/</span>
          {c.last ? (
            <span className="text-ink">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-ink">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
