"use client";

import { signOut } from "next-auth/react";
import { Breadcrumb } from "./Breadcrumb";

export function TopBar({ serverName }: { serverName: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-line bg-bg-base/70 px-8 backdrop-blur-xl">
      <Breadcrumb serverName={serverName} />

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-line bg-bg-elevated px-3 py-1.5 text-sm text-ink-subtle md:flex md:w-80">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span className="flex-1">Suchen oder Befehl ausführen…</span>
          <span className="rounded-md border border-line bg-bg-card px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
            ⌘K
          </span>
        </div>

        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-bg-elevated text-ink-muted transition-colors hover:bg-bg-hover hover:text-ink"
          title="Hilfe"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1 1-1 1.7M12 17h.01" /></svg>
        </button>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-bg-elevated text-ink-muted transition-colors hover:bg-bg-hover hover:text-ink"
          title="Abmelden"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></svg>
        </button>
      </div>
    </header>
  );
}
