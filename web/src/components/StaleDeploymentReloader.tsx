"use client";

import { useEffect } from "react";

/**
 * Fängt den Next.js-Fehler "Failed to find Server Action" ab.
 *
 * Der tritt auf, wenn ein offener Browser-Tab noch den alten Build kennt, der
 * Server aber inzwischen neu deployt wurde (z.B. über den Update-Button). Die
 * Action-IDs des alten Builds existieren dann nicht mehr → der Klick „hängt".
 *
 * Statt ewig hängen zu bleiben, laden wir die Seite einmal automatisch neu —
 * danach kennt der Tab den aktuellen Build und alles funktioniert wieder.
 * Eine Reload-Schleife verhindern wir über ein sessionStorage-Flag.
 */
const FLAG = "stale-deploy-reloaded";
const NEEDLE = "Failed to find Server Action";

export function StaleDeploymentReloader() {
  useEffect(() => {
    // Nach einem erfolgreichen Pageload das Flag zurücksetzen — der nächste
    // echte Skew darf wieder einmal neu laden.
    const clear = setTimeout(() => sessionStorage.removeItem(FLAG), 4000);

    const matches = (reason: unknown): boolean => {
      const msg =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";
      return msg.includes(NEEDLE);
    };

    const reloadOnce = () => {
      if (sessionStorage.getItem(FLAG)) return; // schon einmal probiert → keine Schleife
      sessionStorage.setItem(FLAG, "1");
      window.location.reload();
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      if (matches(e.reason)) {
        e.preventDefault();
        reloadOnce();
      }
    };
    const onError = (e: ErrorEvent) => {
      if (matches(e.error ?? e.message)) reloadOnce();
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      clearTimeout(clear);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
