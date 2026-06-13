"use client";

import { useState, useTransition } from "react";
import { setProfileVisibility, setBirthdayPrivacy, type BirthdayPrivacyKey } from "./actions";

interface BirthdayState {
  hasBirthday: boolean;
  hasYear: boolean;
  show: boolean;
  showAge: boolean;
  announce: boolean;
}

interface Props {
  userId: string;
  ownerKey: string;
  isPublic: boolean;
  birthday: BirthdayState;
}

export function OwnerPanel({ userId, ownerKey, isPublic: initialPublic, birthday }: Props) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [bday, setBday] = useState(birthday);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleBirthday(field: BirthdayPrivacyKey, current: boolean, set: (v: boolean) => void) {
    setError(null);
    const next = !current;
    set(next);
    startTransition(async () => {
      const res = await setBirthdayPrivacy(userId, ownerKey, field, next);
      if (!res.ok) {
        set(current);
        setError(res.error ?? "Fehler beim Speichern");
      }
    });
  }

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

      {/* Geburtstags-Privatsphäre */}
      {bday.hasBirthday ? (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink">Geburtstag</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Gesetzt per <code className="rounded bg-bg-elevated px-1 py-0.5">/geburtstag</code>.
            Steuere hier, was sichtbar ist.
          </p>
          <div className="mt-3 space-y-1.5">
            <PrivacyRow
              label="Auf meinem Profil anzeigen"
              checked={bday.show}
              onToggle={() => toggleBirthday("birthdayShow", bday.show, (v) => setBday((b) => ({ ...b, show: v })))}
              disabled={pending}
            />
            {bday.hasYear && (
              <PrivacyRow
                label="Alter anzeigen"
                checked={bday.showAge}
                onToggle={() => toggleBirthday("birthdayShowAge", bday.showAge, (v) => setBday((b) => ({ ...b, showAge: v })))}
                disabled={pending}
              />
            )}
            <PrivacyRow
              label="Im Geburtstags-Channel angekündigt werden"
              checked={bday.announce}
              onToggle={() => toggleBirthday("birthdayAnnounce", bday.announce, (v) => setBday((b) => ({ ...b, announce: v })))}
              disabled={pending}
            />
          </div>
        </div>
      ) : (
        <div className="mt-5 border-t border-line pt-4 text-xs text-ink-subtle">
          Noch kein Geburtstag gesetzt — nutze in Discord{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5">/geburtstag setzen</code>.
        </div>
      )}

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

function PrivacyRow({
  label,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover disabled:opacity-60"
    >
      <span className="text-ink">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-zinc-600"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}
