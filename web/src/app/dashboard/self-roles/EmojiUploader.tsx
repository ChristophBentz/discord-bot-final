"use client";

import { useRef, useState, useTransition } from "react";
import { uploadEmoji } from "./actions";

export function EmojiUploader({
  suggestedName,
  onUploaded,
}: {
  suggestedName?: string;
  onUploaded: (mention: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const onPickFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Nur Bilddateien erlaubt.");
      return;
    }
    if (f.size > 256 * 1024) {
      setError("Datei zu groß — max. 256 KB (Discord-Limit).");
      return;
    }
    setError(null);
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result ?? ""));
    reader.readAsDataURL(f);
    // Default-Name aus Dateiname ableiten
    if (!name) {
      const base = f.name.replace(/\.[^.]+$/, "").replace(/\W+/g, "_").slice(0, 32);
      if (base.length >= 2) setName(base);
    }
  };

  const onUpload = () => {
    if (!preview) return;
    setError(null);
    start(async () => {
      const r = await uploadEmoji(name, preview);
      if (r.ok) {
        onUploaded(r.emoji.mention);
        setOpen(false);
        setFile(null);
        setPreview(null);
        setName("");
      } else {
        setError(r.error);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] text-brand hover:text-brand-light"
      >
        + eigenes Bild als Emoji hochladen
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-brand/30 bg-brand/[0.04] p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-ink">Custom-Emoji hochladen</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-ink-muted hover:text-ink"
        >
          Abbrechen
        </button>
      </div>

      <div className="flex items-start gap-2">
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) onPickFile(f);
          }}
          onDragOver={(e) => e.preventDefault()}
          className="grid h-16 w-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-bg-card text-ink-subtle hover:border-brand/40"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 16l5-5 4 4 6-6 3 3" />
            </svg>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
            e.target.value = "";
          }}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.replace(/\W+/g, "_").slice(0, 32))}
            placeholder="Emoji-Name (a-z, 0-9, _)"
            maxLength={32}
            className="input text-sm"
          />
          <p className="text-[10px] text-ink-subtle">
            PNG/JPG/GIF/WEBP, max. 256 KB. Wird permanent als Server-Emoji gespeichert.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onUpload}
        disabled={isUploading || !preview || name.length < 2}
        className="btn-primary w-full text-xs disabled:opacity-60"
      >
        {isUploading ? "Lade hoch…" : "Als Server-Emoji speichern"}
      </button>
    </div>
  );
}
