"use client";

import { useState, useTransition } from "react";
import { setProfileVisibility } from "./actions";

interface Props {
  userId: string;
  ownerKey: string;
  isPublic: boolean;
}

export function OwnerPanel({ userId, ownerKey, isPublic: initialPublic }: Props) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    const next = !isPublic;
    startTransition(async () => {
      const res = await setProfileVisibility(userId, ownerKey, next);
      if (res.ok) {
        setIsPublic(next);
      } else {
        setError(res.error ?? "Fehler beim Speichern");
      }
    });
  }

  function copyPublicLink() {
    const url = `${window.location.origin}/u/${userId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Dein Profil — Bearbeiten-Modus
          </div>
          <h2 className="mt-1 text-lg font-semibold text-ink">Sichtbarkeit</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Wenn dein Profil <strong>privat</strong> ist, sehen andere nur deinen Namen und Avatar.
            Du selbst siehst es weiter komplett über diesen Link.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`group inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            isPublic
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
              : "border-zinc-500/30 bg-zinc-500/5 text-ink hover:bg-zinc-500/10"
          } ${pending ? "opacity-60" : ""}`}
        >
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isPublic ? "bg-emerald-500" : "bg-zinc-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isPublic ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </span>
          {isPublic ? "Profil ist öffentlich" : "Profil ist privat"}
        </button>

        {isPublic && (
          <button
            type="button"
            onClick={copyPublicLink}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg-elevated px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-bg-hover hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? "Kopiert!" : "Öffentlichen Link kopieren"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <p className="mt-3 text-xs text-ink-subtle">
        Tipp: Falls jemand deinen Bearbeiten-Link kennt, kannst du in Discord mit{" "}
        <code className="rounded bg-bg-elevated px-1 py-0.5 text-[11px]">/profil reset</code> einen
        neuen erzeugen — der alte ist sofort ungültig.
      </p>
    </div>
  );
}
