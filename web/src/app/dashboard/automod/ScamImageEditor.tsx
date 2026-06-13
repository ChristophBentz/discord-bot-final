"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBlockedImage, removeBlockedImage } from "./actions";

export interface BlockedImageRow {
  id: number;
  label: string;
  thumbnail: string | null;
}

const MAX_BYTES = 8 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

export function ScamImageEditor({ images }: { images: BlockedImageRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAdd] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isRemoving, startRemove] = useTransition();

  const onPick = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Bitte eine Bilddatei auswählen.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Bild zu groß (max 8 MB).");
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setPreview(dataUrl);
      if (!label.trim()) setLabel(file.name.replace(/\.[^.]+$/, ""));
    } catch {
      setError("Datei konnte nicht gelesen werden.");
    }
  };

  const onAdd = () => {
    if (!preview) {
      setError("Bitte zuerst ein Bild auswählen.");
      return;
    }
    setError(null);
    startAdd(async () => {
      const r = await addBlockedImage({ imageBase64: preview, label });
      if (r.ok) {
        setPreview(null);
        setLabel("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  };

  const onRemove = (id: number) => {
    setPendingId(id);
    startRemove(async () => {
      await removeBlockedImage(id);
      router.refresh();
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-5">
      {/* Upload-Bereich */}
      <div className="rounded-xl border border-line bg-bg-elevated/40 p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-bg-card/50">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Vorschau" className="h-full w-full object-cover" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs font-medium text-brand hover:text-brand-light"
            >
              {preview ? "Anderes Bild" : "Bild wählen"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
                Bezeichnung
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={100}
                placeholder="z. B. Steam-Geschenk-Scam"
                className="input w-full"
              />
              <p className="mt-1 text-[10px] text-ink-subtle">
                Nur intern — erscheint im Log, wenn das Bild erkannt wird.
              </p>
            </div>
            <button
              type="button"
              onClick={onAdd}
              disabled={isAdding || !preview}
              className="btn-primary self-start disabled:opacity-60"
            >
              {isAdding ? "Wird hinterlegt…" : "Bild hinterlegen"}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          {images.length} {images.length === 1 ? "Bild" : "Bilder"} hinterlegt
        </div>
        {images.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
            Noch keine Scam-Bilder hinterlegt.
          </div>
        ) : (
          <div className="grid max-h-[40vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {images.map((img) => (
              <div
                key={img.id}
                className={`group relative overflow-hidden rounded-xl border border-line bg-bg-elevated/60 transition-opacity ${
                  pendingId === img.id ? "opacity-40" : ""
                }`}
              >
                <div className="aspect-video w-full overflow-hidden bg-bg-card">
                  {img.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.thumbnail} alt={img.label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-ink-subtle">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <span className="truncate text-xs text-ink" title={img.label}>
                    {img.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(img.id)}
                    disabled={isRemoving}
                    title="Entfernen"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
