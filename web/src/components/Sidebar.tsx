"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

type IconName =
  | "home"
  | "users"
  | "chart"
  | "shield"
  | "warning"
  | "doc"
  | "envelope"
  | "trophy"
  | "terminal"
  | "sparkles"
  | "medal"
  | "ticket"
  | "music"
  | "coin"
  | "settings"
  | "cog"
  | "gift"
  | "send"
  | "plus";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
  soon?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Server",
    items: [
      { href: "/dashboard", label: "Übersicht", icon: "home" },
      { href: "/dashboard/members", label: "Mitglieder", icon: "users" },
      { href: "/dashboard/general", label: "Allgemein", icon: "settings" },
    ],
  },
  {
    title: "Moderation",
    items: [
      { href: "/dashboard/logging", label: "Audit Logs", icon: "doc" },
      { href: "/dashboard/moderation", label: "Moderation", icon: "shield" },
      { href: "/dashboard/automod", label: "AutoMod", icon: "warning" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/dashboard/welcome", label: "Welcome", icon: "envelope" },
      { href: "/dashboard/leveling", label: "Leveling", icon: "trophy" },
      { href: "/dashboard/achievements", label: "Achievements", icon: "medal" },
      { href: "/dashboard/commands", label: "Custom Commands", icon: "terminal", soon: true },
      { href: "/dashboard/reactions", label: "Reaction Rolls", icon: "sparkles", soon: true },
    ],
  },
  {
    title: "Utility",
    items: [
      { href: "/dashboard/temp-channels", label: "Temp-Channels", icon: "plus" },
      { href: "/dashboard/tickets", label: "Tickets", icon: "ticket" },
      { href: "/dashboard/music", label: "Musik", icon: "music" },
      { href: "/dashboard/free-games", label: "Free Games", icon: "gift" },
      { href: "/dashboard/compose", label: "Nachrichten", icon: "send" },
    ],
  },
];

function Icon({ name }: { name: IconName }) {
  const cls = "h-[18px] w-[18px]";
  const stroke = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "home":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></svg>
      );
    case "users":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M21 19c0-2.5-1.8-4.5-4-5" /></svg>
      );
    case "chart":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
      );
    case "shield":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" /></svg>
      );
    case "warning":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M12 4 2 21h20L12 4Z" /><path d="M12 10v5" /><circle cx="12" cy="18" r="0.5" fill="currentColor" /></svg>
      );
    case "doc":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>
      );
    case "envelope":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
      );
    case "trophy":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>
      );
    case "terminal":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="m4 7 4 4-4 4M12 15h8" /></svg>
      );
    case "sparkles":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="m12 4 1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5L12 4Z" /><path d="M19 4v3M21 5.5h-3M5 16v3M6.5 17.5h-3" /></svg>
      );
    case "medal":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M7 3h10l-3 6H10L7 3Z" /><circle cx="12" cy="15" r="5" /><path d="m10 14 2 2 4-4" /></svg>
      );
    case "ticket":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M13 6v12" /></svg>
      );
    case "music":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
      );
    case "plus":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
      );
    case "coin":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M9 9h4.5a2 2 0 1 1 0 4H9a2 2 0 1 0 0 4h5" /></svg>
      );
    case "settings":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
      );
    case "cog":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" /></svg>
      );
    case "gift":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
      );
    case "send":
      return (
        <svg className={cls} viewBox="0 0 24 24" {...stroke}><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></svg>
      );
  }
}

function ServerAvatar({ name, iconUrl }: { name: string; iconUrl: string | null }) {
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt={name}
        className="h-10 w-10 rounded-xl object-cover shadow-glow ring-1 ring-line"
      />
    );
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
  return (
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-sm font-semibold text-white shadow-glow">
      {text.toUpperCase()}
    </span>
  );
}

interface SidebarProps {
  serverName: string;
  memberCount: number;
  serverIconUrl: string | null;
}

export function Sidebar({ serverName, memberCount, serverIconUrl }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "User";
  const userInitial = userName[0]?.toUpperCase() ?? "U";

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-bg-raised/60 backdrop-blur-xl">
      {/* Server-Card */}
      <div className="border-b border-line p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-bg-card p-3">
          <ServerAvatar name={serverName} iconUrl={serverIconUrl} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{serverName}</div>
            <div className="truncate text-[11px] text-ink-muted">
              {memberCount.toLocaleString("de-DE")} Mitglieder · <span className="text-emerald-400">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-brand-subtle text-ink"
                        : "text-ink-muted hover:bg-bg-hover hover:text-ink"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={active ? "text-brand" : "text-ink-subtle"}>
                        <Icon name={item.icon} />
                      </span>
                      <span className="truncate font-medium">{item.label}</span>
                    </span>
                    {item.soon && (
                      <span className="rounded-md border border-line bg-bg-elevated px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-subtle">
                        bald
                      </span>
                    )}
                    {item.badge && (
                      <span className="rounded-md bg-bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User-Profil */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt=""
              className="h-9 w-9 rounded-full ring-2 ring-bg-card"
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
              {userInitial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{userName}</div>
            <div className="truncate text-[11px] text-ink-subtle">eingeloggt</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
