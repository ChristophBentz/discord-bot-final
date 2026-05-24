"use client";

import { useRef, useState, useTransition } from "react";
import {
  saveBotAvatar,
  saveBotBanner,
  saveBotDescription,
  saveBotNickname,
} from "./actions";

interface Props {
  initialName: string | null;
  initialAvatarUrl: string | null;
  initialBannerUrl: string | null;
  initialDescription: string;
}

export function BotIdentityForm({
  initialName,
  initialAvatarUrl,
  initialBannerUrl,
  initialDescription,
}: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState(initialDescription);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initialBannerUrl);
  const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const initial = (name[0] ?? "B").toUpperCase();
  const dirtyAvatar = avatarDataUrl !== null;
  const dirtyBanner = bannerDataUrl !== null;
  const dirtyName = (initialName ?? "") !== name;
  const dirtyDescription = initialDescription !== description;
  const dirty = dirtyAvatar || dirtyBanner || dirtyName || dirtyDescription;

  const pickImage = (
    file: File,
    target: "avatar" | "banner",
  ) => {
    if (!file.type.startsWith("image/")) {
      setFeedback({ kind: "error", msg: "Nur Bilddateien erlaubt." });
      return;
    }
    const max = target === "avatar" ? 8 : 10;
    if (file.size > max * 1024 * 1024) {
      setFeedback({ kind: "error", msg: `Datei zu groß (max. ${max} MB).` });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      if (target === "avatar") {
        setAvatarDataUrl(result);
        setAvatarPreview(result);
      } else {
        setBannerDataUrl(result);
        setBannerPreview(result);
      }
      setFeedback(null);
    };
    reader.readAsDataURL(file);
  };

  const onAvatarPick = (file: File) => pickImage(file, "avatar");
  const onBannerPick = (file: File) => pickImage(file, "banner");

  const onAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onAvatarPick(file);
  };
  const onBannerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onBannerPick(file);
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
      if (dirtyBanner) {
        const r = await saveBotBanner(bannerDataUrl);
        if (!r.ok) errors.push(`Banner: ${r.error}`);
        else if (r.bannerUrl !== undefined) setBannerPreview(r.bannerUrl);
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
        setBannerDataUrl(null);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Live-Preview — Discord-Profil-Stil mit Banner */}
      <div className="overflow-hidden rounded-2xl border border-line bg-bg-elevated/40">
        <div
          className="h-24 w-full"
          style={{
            background: bannerPreview
              ? `url(${bannerPreview}) center / cover`
              : "linear-gradient(135deg, rgb(168 85 247 / 0.3), rgb(124 58 237 / 0.2))",
          }}
        />
        <div className="-mt-8 flex items-end gap-4 px-4 pb-4">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt={name}
              className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-bg-elevated"
            />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-gradient text-xl font-semibold text-white ring-4 ring-bg-elevated">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-lg font-semibold text-ink">
                {name || "Bot"}
              </span>
              <span className="rounded bg-brand/20 px-1.5 py-0.5 text-[9px] font-semibold text-brand-light">
                APP
              </span>
            </div>
            <div className="mt-1 line-clamp-2 text-xs text-ink-muted">
              {description || <span className="italic text-ink-subtle">Keine Beschreibung</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Avatar + Banner */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-ink">Avatar</label>
          <div
            onDrop={onAvatarDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm"
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
                Zurücksetzen
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink-subtle">PNG/JPG/GIF, max. 8 MB. Drag & Drop möglich.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAvatarPick(file);
              e.target.value = "";
            }}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-ink">Banner</label>
          <div
            onDrop={onBannerDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="btn-secondary text-sm"
            >
              Bild auswählen
            </button>
            {dirtyBanner && (
              <button
                type="button"
                onClick={() => {
                  setBannerDataUrl(null);
                  setBannerPreview(initialBannerUrl);
                }}
                className="text-xs text-ink-muted hover:text-ink"
              >
                Zurücksetzen
              </button>
            )}
            {!dirtyBanner && bannerPreview && (
              <button
                type="button"
                onClick={() => {
                  setBannerDataUrl("");
                  setBannerPreview(null);
                }}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Entfernen
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink-subtle">PNG/JPG/GIF, max. 10 MB. Empfohlen 600×240.</p>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onBannerPick(file);
              e.target.value = "";
            }}
          />
        </div>
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
