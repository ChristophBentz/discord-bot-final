"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  /** Optionales Zähler-Badge neben dem Label. */
  count?: number;
  /** Punkt-Indikator, z.B. für "hier wartet etwas auf dich". */
  attention?: boolean;
  content: ReactNode;
}

/**
 * Segmented-Control-Tabs für Dashboard-Seiten. Die Panels kommen als
 * Server-gerenderte ReactNodes rein und bleiben gemountet (hidden statt
 * unmount), damit Formular-State beim Tab-Wechsel nicht verloren geht.
 */
export function DashboardTabs({ items, defaultTab }: { items: TabItem[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.key ?? "");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-bg-elevated/40 p-1"
      >
        {items.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-bg-card text-ink shadow-card"
                  : "text-ink-muted hover:bg-bg-hover/60 hover:text-ink"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    isActive ? "bg-bg-elevated text-ink-muted" : "bg-bg-card text-ink-subtle"
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {tab.attention && !isActive && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>
      {items.map((tab) => (
        <div key={tab.key} role="tabpanel" hidden={tab.key !== active}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
