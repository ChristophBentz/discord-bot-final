"use client";

import { useEffect, useRef } from "react";
import { refreshMemberBanner } from "./actions";

/**
 * Stößt den Banner-/Accent-Refresh nach dem Mount im Hintergrund an, statt
 * den Seiten-Render zu blockieren. Wird nur gerendert, wenn ein Refresh fällig
 * ist. Die Server-Action revalidiert die Seite, sobald der Banner da ist.
 */
export function BannerRefresher({ userId }: { userId: string }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refreshMemberBanner(userId);
  }, [userId]);
  return null;
}
