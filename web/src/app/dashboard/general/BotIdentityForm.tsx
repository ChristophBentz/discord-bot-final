"use client";

import { useRef, useState, useTransition } from "react";
import {
  saveBotAvatar,
  saveBotDescription,
  saveBotNickname,
} from "./actions";

interface Props {
  initialName: string | null;
  initialAvatarUrl: string | null;
  initialDescription: string;
}

export function BotIdentityForm({ initialName, initialAvatarUrl, initialDescription }: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState(initialDescription);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null); // nur wenn neu gewählt
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = (name[0] ?? "B").toUpperCase();
  const dirtyAvatar = avatarDataUrl !== null;
  const dirtyName = (initialName ?? "") !== name;
  const dirtyDescription = initialDescription !== description;
  const dirty = dirtyAvatar || dirtyName || dirtyDescription;

  const onPickFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setFeedback({ kind: "error", msg: "Nur Bilddateien erlaubt." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ kind: "error", msg: "Datei zu groß (max. 8 MB)." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setAvatarDataUrl(result);
      setAvatarPreview(result);
      setFeedback(null);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onPickFile(file);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const errors: string[] = [];

      if (dirtyAvatar) {
        const r = await saveBotAvatar(avatarDataUrl);
        if (!r.ok) errors.push(`Avatar: ${r.error}`);
        else if (r.avatarUrl) setAvatarPreview(r.avatarUrl);
      }
      if (dirtyName) {
        const fd = new FormData();
        fd.set("botNickname", name);
        const r = await saveBotNickname(fd);
        if (!r.ok) errors.push(`Name: ${r.error}`);
      }
      if (dirtyDescription) {
        const fd = new FormData();
        fd.set("botDescription", description);
        const r = await saveBotDescription(fd);
        if (!r.ok) errors.push(`Beschreibung: ${r.error}`);
      }

      if (errors.length > 0) {
        setFeedback({ kind: "error", msg: errors.join(" · ") });
      } else {
        setFeedback({ kind: "ok", msg: "Gespeichert." });
        setAvatarDataUrl(null);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Live-Preview */}
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-bg-elevated/40 p-4">
        {avatarPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarPreview}
            alt={name}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-line"
          />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-gradient text-xl font-semibold text-white">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-lg font-semibold text-ink">
              {name || "Bot"}
            </span>
            <span className="rounded bg-brand/20 px-1.5 py-0.5 text-[9px] font-semibold text-brand-light">
              APP
            </span>
          </div>
          <div className="mt-1 line-clamp-2 text-sm text-ink-muted">
            {description || <span className="italic text-ink-subtle">Keine Beschreibung</span>}
          </div>
        </div>
      </div>

      {/* Avatar-Upload */}
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Avatar</label>
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
          >
            Bild auswählen
          </button>
          {dirtyAvatar && (
            <button
              type="button"
              onClick={() => {
                setAvatarDataUrl(null);
                setAvatarPreview(initialAvatarUrl);
              }}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Auswahl zurücksetzen
            </button>
          )}
          <span className="text-xs text-ink-subtle">
            PNG/JPG/GIF, max. 8 MB. Auch per Drag & Drop hier rein.
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Name */}
      <div>
        <label htmlFor="bot-name" className="mb-1.5 block text-sm font-medium text-ink">
          Server-Nickname
        </label>
        <input
          id="bot-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Harald"
          maxLength={32}
          className="input"
        />
        <div className="mt-1.5 flex justify-between text-xs text-ink-subtle">
          <span>Wie der Bot auf diesem Server angezeigt wird.</span>
          <span>{name.length} / 32</span>
        </div>
      </div>

      {/* Beschreibung */}
      <div>
        <label htmlFor="bot-description" className="mb-1.5 block text-sm font-medium text-ink">
          Beschreibung
        </label>
        <textarea
          id="bot-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was macht der Bot?"
          maxLength={400}
          rows={3}
          className="input resize-y"
        />
        <div className="mt-1.5 flex justify-between text-xs text-ink-subtle">
          <span>Erscheint auf dem Bot-Profil in Discord.</span>
          <span>{description.length} / 400</span>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button
          type="submit"
          disabled={isPending || !dirty}
          className="btn-primary disabled:opacity-60"
        >
          {isPending ? "Speichere…" : "Speichern"}
        </button>
        {!dirty && !feedback && (
          <span className="text-xs text-ink-subtle">Keine Änderungen</span>
        )}
        {feedback && (
          <span
            className={`text-sm ${
              feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  );
}
