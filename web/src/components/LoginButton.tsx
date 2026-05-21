"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-sm text-ink-muted">Lade…</span>;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {session.user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? "Avatar"}
            className="h-8 w-8 rounded-full ring-1 ring-line"
          />
        )}
        <div className="hidden text-sm sm:block">
          <div className="font-medium text-ink">{session.user.name}</div>
        </div>
        <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary">
          Abmelden
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
      className="btn-primary"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.06 14.06 0 0 0-.642 1.32 18.27 18.27 0 0 0-5.487 0A12.51 12.51 0 0 0 9.787 3a19.74 19.74 0 0 0-3.76 1.369C2.36 9.91 1.42 15.32 1.89 20.65a19.93 19.93 0 0 0 6.05 3.06 14.66 14.66 0 0 0 1.297-2.105 12.78 12.78 0 0 1-2.04-.98c.171-.126.338-.258.5-.392a14.19 14.19 0 0 0 12.595 0c.163.137.33.27.5.392-.65.387-1.337.713-2.045.98a14.39 14.39 0 0 0 1.298 2.105 19.86 19.86 0 0 0 6.054-3.06c.526-6.18-.897-11.54-3.782-16.282Z" />
      </svg>
      Mit Discord anmelden
    </button>
  );
}
