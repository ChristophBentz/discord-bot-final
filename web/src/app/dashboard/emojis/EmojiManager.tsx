"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import { deleteEmoji, renameEmoji, uploadEmoji, type EmojiItem } from "./actions";
import { fileNameToEmojiName, processImageForEmoji, type ResizeResult } from "./imageResize";

type QueueStatus = "pending" | "processing" | "ready" | "uploading" | "done" | "error";

interface QueueItem {
  id: string; // local uuid
  file: File;
  name: string;
  status: QueueStatus;
  preview?: string;
  processed?: ResizeResult;
  error?: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function fmtKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function EmojiManager({ initial }: { initial: EmojiItem[] }) {
  const dialog = useDialog();
  const [emojis, setEmojis] = useState<EmojiItem[]>(initial);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? emojis.filter((e) => e.name.toLowerCase().includes(q)) : emojis;
  }, [emojis, search]);

  // Automatisch alle "pending" Items verarbeiten (resize)
  useEffect(() => {
    const next = queue.find((q) => q.status === "pending");
    if (!next) return;
    setQueue((q) => q.map((i) => (i.id === next.id ? { ...i, status: "processing" } : i)));
    processImageForEmoji(next.file)
      .then((result) => {
        setQueue((q) =>
          q.map((i) =>
            i.id === next.id
              ? { ...i, status: "ready", processed: result, preview: result.dataUrl }
              : i,
          ),
        );
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setQueue((q) => q.map((i) => (i.id === next.id ? { ...i, status: "error", error: msg } : i)));
      });
  }, [queue]);

  const addFiles = (files: FileList | File[]) => {
    const newItems: QueueItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: uid(),
        file,
        name: fileNameToEmojiName(file.name) || "emoji",
        status: "pending",
      }));
    if (newItems.length === 0) return;
    setQueue((q) => [...q, ...newItems]);
  };

  const updateName = (id: string, name: string) => {
    setQueue((q) =>
      q.map((i) => (i.id === id ? { ...i, name: name.replace(/\W+/g, "_").slice(0, 32) } : i)),
    );
  };

  const removeFromQueue = (id: string) => {
    setQueue((q) => q.filter((i) => i.id !== id));
  };

  const uploadOne = async (item: QueueItem) => {
    if (item.status !== "ready" || !item.processed) return;
    setQueue((q) => q.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i)));
    const r = await uploadEmoji(item.name, item.processed.dataUrl);
    if (r.ok) {
      setQueue((q) => q.map((i) => (i.id === item.id ? { ...i, status: "done" } : i)));
      setEmojis((e) => [...e, r.emoji].sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      setQueue((q) =>
        q.map((i) => (i.id === item.id ? { ...i, status: "error", error: r.error } : i)),
      );
    }
  };

  const uploadAll = async () => {
    const ready = queue.filter((q) => q.status === "ready");
    for (const item of ready) {
      await uploadOne(item);
    }
  };

  const clearDone = () => {
    setQueue((q) => q.filter((i) => i.status !== "done"));
  };

  const onDelete = async (id: string, emojiName: string) => {
    if (
      !(await dialog.confirm({
        title: "Emoji löschen",
        message: `:${emojiName}: wird vom Server entfernt.`,
        confirmLabel: "Löschen",
        danger: true,
      }))
    )
      return;
    const r = await deleteEmoji(id);
    if (r.ok) {
      setEmojis((e) => e.filter((x) => x.id !== id));
    } else {
      await dialog.alert({ title: "Löschen fehlgeschlagen", message: r.error, danger: true });
    }
  };

  const onRename = async (id: string, oldName: string) => {
    const name = await dialog.prompt({
      title: "Emoji umbenennen",
      label: "Neuer Name",
      defaultValue: oldName,
      placeholder: "emoji_name",
      maxLength: 32,
      confirmLabel: "Umbenennen",
    });
    if (!name || name === oldName) return;
    const r = await renameEmoji(id, name);
    if (r.ok) {
      setEmojis((e) =>
        e
          .map((x) => (x.id === id ? { ...x, name: r.name } : x))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } else {
      await dialog.alert({ title: "Umbenennen fehlgeschlagen", message: r.error, danger: true });
    }
  };

  const readyCount = queue.filter((q) => q.status === "ready").length;
  const doneCount = queue.filter((q) => q.status === "done").length;
  const errorCount = queue.filter((q) => q.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Upload-Zone */}
      <section className="card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Neue Emojis hochladen</h2>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Mehrere Bilder gleichzeitig. Werden automatisch auf 128×128 verkleinert und unter
            256 KB komprimiert. Animierte GIFs bleiben unverändert.
          </p>
        </div>

        <div
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-bg-elevated/40 p-10 text-center transition-colors hover:border-brand/40 hover:bg-bg-hover/30"
        >
          <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <div className="mt-3 text-sm font-medium text-ink">
            Bilder hier reinziehen oder klicken
          </div>
          <div className="mt-1 text-xs text-ink-subtle">
            PNG, JPG, WEBP, GIF · Mehrfach-Auswahl möglich
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {queue.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="text-xs text-ink-muted">
                {queue.length} Datei{queue.length === 1 ? "" : "en"} in der Queue ·{" "}
                <span className="text-emerald-400">{doneCount} hochgeladen</span>
                {readyCount > 0 && (
                  <>
                    {" · "}
                    <span className="text-brand-light">{readyCount} bereit</span>
                  </>
                )}
                {errorCount > 0 && (
                  <>
                    {" · "}
                    <span className="text-rose-400">{errorCount} Fehler</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {doneCount > 0 && (
                  <button type="button" onClick={clearDone} className="text-xs text-ink-muted hover:text-ink">
                    Erledigte ausblenden
                  </button>
                )}
                {readyCount > 0 && (
                  <button type="button" onClick={uploadAll} className="btn-primary text-sm">
                    Alle {readyCount} hochladen
                  </button>
                )}
              </div>
            </div>

            <ul className="space-y-2">
              {queue.map((item) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  onChangeName={(n) => updateName(item.id, n)}
                  onRemove={() => removeFromQueue(item.id)}
                  onUpload={() => uploadOne(item)}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Bestehende Emojis */}
      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Server-Emojis</h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              Bestehende Custom-Emojis auf dem Server. Klick auf einen für Aktionen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen…"
              className="input w-48 text-sm"
            />
            <span className="rounded-full bg-bg-elevated px-2.5 py-1 text-xs text-ink-muted">
              {emojis.length} insgesamt
            </span>
          </div>
        </div>

        {filteredEmojis.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
            {search ? `Kein Emoji mit „${search}"` : "Noch keine Server-Emojis."}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {filteredEmojis.map((e) => (
              <EmojiCard
                key={e.id}
                emoji={e}
                onRename={() => onRename(e.id, e.name)}
                onDelete={() => onDelete(e.id, e.name)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QueueRow({
  item,
  onChangeName,
  onRemove,
  onUpload,
}: {
  item: QueueItem;
  onChangeName: (n: string) => void;
  onRemove: () => void;
  onUpload: () => void;
}) {
  const statusInfo: Record<QueueStatus, { color: string; label: string }> = {
    pending: { color: "bg-zinc-500/20 text-zinc-300", label: "Wartend" },
    processing: { color: "bg-amber-500/20 text-amber-300", label: "Verarbeite…" },
    ready: { color: "bg-brand/20 text-brand-light", label: "Bereit" },
    uploading: { color: "bg-amber-500/20 text-amber-300", label: "Lade hoch…" },
    done: { color: "bg-emerald-500/20 text-emerald-300", label: "Hochgeladen ✓" },
    error: { color: "bg-rose-500/20 text-rose-300", label: "Fehler" },
  };
  const s = statusInfo[item.status];
  const isDone = item.status === "done";
  const isError = item.status === "error";

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border bg-bg-elevated/40 p-3 transition-opacity ${
        isDone ? "opacity-60" : ""
      } ${isError ? "border-rose-500/30" : "border-line"}`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg-card">
        {item.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.preview} alt="" className="h-full w-full object-contain" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-subtle animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <input
            value={item.name}
            onChange={(e) => onChangeName(e.target.value)}
            disabled={isDone || item.status === "uploading"}
            maxLength={32}
            className="input flex-1 py-1 text-sm font-mono disabled:opacity-60"
          />
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>
            {s.label}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-ink-subtle">
          {item.processed ? (
            <>
              {item.processed.format.toUpperCase()} ·{" "}
              {item.processed.width > 0 && `${item.processed.width}×${item.processed.height} · `}
              {fmtKB(item.processed.byteSize)}
              {item.processed.shrunk && " · verkleinert"}
            </>
          ) : (
            <>{fmtKB(item.file.size)} · Original</>
          )}
          {item.error && <span className="ml-2 text-rose-400">{item.error}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {item.status === "ready" && (
          <button
            type="button"
            onClick={onUpload}
            className="rounded-md bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand-light hover:bg-brand/25"
          >
            Hochladen
          </button>
        )}
        {!isDone && (
          <button
            type="button"
            onClick={onRemove}
            disabled={item.status === "uploading"}
            title="Aus Queue entfernen"
            className="grid h-7 w-7 place-items-center rounded-md text-ink-subtle hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>
    </li>
  );
}

function EmojiCard({
  emoji,
  onRename,
  onDelete,
}: {
  emoji: EmojiItem;
  onRename: () => void;
  onDelete: () => void;
}) {
  const ext = emoji.animated ? "gif" : "png";
  const src = `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=96`;
  return (
    <div className="group relative flex flex-col items-center gap-1.5 rounded-xl border border-line bg-bg-elevated/40 p-3 hover:border-line-strong">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={emoji.name} className="h-12 w-12 object-contain" />
      <div className="w-full truncate text-center text-[10px] text-ink-muted">:{emoji.name}:</div>
      <div className="absolute inset-x-2 bottom-1 flex translate-y-2 items-center justify-between gap-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={onRename}
          title="Umbenennen"
          className="grid h-6 w-6 place-items-center rounded-md bg-bg-card/80 text-ink-muted backdrop-blur hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Löschen"
          className="grid h-6 w-6 place-items-center rounded-md bg-bg-card/80 text-ink-muted backdrop-blur hover:bg-rose-500/20 hover:text-rose-400"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
      {emoji.animated && (
        <span className="absolute right-1 top-1 rounded bg-amber-500/80 px-1 text-[8px] font-bold uppercase text-black">
          GIF
        </span>
      )}
    </div>
  );
}
