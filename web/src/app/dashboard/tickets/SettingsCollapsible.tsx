"use client";

import { useState, type ReactNode } from "react";

export function SettingsCollapsible({
  defaultOpen = false,
  summary,
  hint,
  children,
}: {
  defaultOpen?: boolean;
  summary: string;
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-bg-hover/30"
      >
        <div>
          <h2 className="text-lg font-semibold">{summary}</h2>
          {hint && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-200 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        } overflow-hidden`}
      >
        <div className="min-h-0">
          <div className="border-t border-line px-6 py-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
