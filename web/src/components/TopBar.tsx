"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Breadcrumb } from "./Breadcrumb";
import { SearchPalette } from "./SearchPalette";
import { HelpModal } from "./HelpModal";

export function TopBar({ serverName }: { serverName: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-line bg-bg-base/80 px-6 backdrop-blur-xl">
        <Breadcrumb serverName={serverName} />

        <div className="flex items-center gap-1.5">
          {/* Desktop: vollwertige Suchleiste */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group hidden h-9 items-center gap-2 rounded-lg border border-line/60 bg-bg-card/50 pl-3 pr-1.5 text-sm text-ink-subtle transition-all hover:border-line-strong hover:bg-bg-card hover:text-ink md:flex md:w-72"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 transition-colors group-hover:text-ink-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="flex-1 text-left">Suchen…</span>
            <kbd className="hidden items-center gap-0.5 rounded border border-line bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-subtle group-hover:text-ink-muted sm:inline-flex">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </button>

          {/* Mobile: nur Icon-Button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-bg-card hover:text-ink md:hidden"
            title="Suchen (⌘K)"
            aria-label="Suchen"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>

          <div className="mx-1 hidden h-5 w-px bg-line md:block" />

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-bg-card hover:text-ink"
            title="Hilfe"
            aria-label="Hilfe"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1 1-1 1.7M12 17h.01" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-bg-card hover:text-ink"
            title="Abmelden"
            aria-label="Abmelden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            </svg>
          </button>
        </div>
      </header>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
