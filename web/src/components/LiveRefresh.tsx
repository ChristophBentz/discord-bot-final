"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Polling-Auto-Refresh für Server-Components.
 * Ruft router.refresh() alle `intervalMs` auf und pausiert, wenn der Tab im Hintergrund ist.
 * Rendert optional ein „Live"-Badge.
 */
export function LiveRefresh({
  intervalMs = 3000,
  badge = true,
}: {
  intervalMs?: number;
  badge?: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(true);

  useEffect(() => {
    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs, active]);

  if (!badge) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
      <span className="relative flex h-1.5 w-1.5">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      {active ? "Live" : "Pausiert"}
    </span>
  );
}
