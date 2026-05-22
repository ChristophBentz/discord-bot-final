"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const RANGES = [
  { value: 7, label: "7 Tage" },
  { value: 30, label: "30 Tage" },
  { value: 90, label: "90 Tage" },
];

export function RangeSelector({ current }: { current: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <div className="inline-flex rounded-xl border border-line bg-bg-elevated/50 p-1">
      {RANGES.map((r) => {
        const isActive = r.value === current;
        const url = new URLSearchParams(params.toString());
        url.set("range", String(r.value));
        return (
          <Link
            key={r.value}
            href={`${pathname}?${url.toString()}`}
            scroll={false}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-brand text-white shadow"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
