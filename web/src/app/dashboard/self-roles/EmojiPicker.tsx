"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listServerEmojis, type UploadedEmoji } from "./actions";
import { EmojiDisplay } from "./EmojiDisplay";
import { EmojiUploader } from "./EmojiUploader";

// Häufige Unicode-Emojis als Quick-Picks
const UNICODE_QUICK = [
  "🎮", "🎯", "🎨", "🎵", "🎬", "📚", "💻", "⚽",
  "🏀", "🎭", "🚀", "🔥", "⭐", "💎", "🌈", "🎁",
  "🏆", "🥇", "🥈", "🥉", "❤", "💜", "💚", "💙",
  "✅", "❌", "⚠", "🔔", "📢", "🎉", "👋", "🙌",
];

interface Props {
  name: string; // hidden input field name (for FormData)
  value: string;
  onChange: (val: string) => void;
  suggestedName?: string; // für Upload
  required?: boolean;
}

export function EmojiPicker({ name, value, onChange, suggestedName, required }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"server" | "unicode" | "upload">("server");
  const [search, setSearch] = useState("");
  const [serverEmojis, setServerEmojis] = useState<UploadedEmoji[] | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open && tab === "server" && serverEmojis === null) {
      void listServerEmojis().then(setServerEmojis);
    }
  }, [open, tab, serverEmojis]);

  const filteredServer = useMemo(() => {
    if (!serverEmojis) return [];
    const q = search.trim().toLowerCase();
    return q ? serverEmojis.filter((e) => e.name.toLowerCase().includes(q)) : serverEmojis;
  }, [serverEmojis, search]);

  const filteredUnicode = useMemo(() => {
    return UNICODE_QUICK;
  }, []);

  const pick = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <input type="hidden" name={name} value={value} required={required} />
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-line bg-bg-elevated px-4 py-2.5 text-sm text-ink shadow-inner hover:border-line-strong"
        >
          {value ? (
            <span className="inline-flex items-center gap-2">
              <EmojiDisplay raw={value} size={18} />
              <span className="truncate font-mono text-xs text-ink-muted">{value}</span>
            </span>
          ) : (
            <span className="text-ink-subtle">— Emoji wählen —</span>
          )}
          <svg className="h-3.5 w-3.5 text-ink-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Emoji entfernen"
            className="grid w-9 shrink-0 place-items-center rounded-xl border border-line bg-bg-elevated text-ink-muted hover:bg-rose-500/15 hover:text-rose-400"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line bg-bg-elevated shadow-card-lg">
          {/* Tabs */}
          <div className="flex border-b border-line">
            <TabButton active={tab === "server"} onClick={() => setTab("server")}>
              Server-Emojis
            </TabButton>
            <TabButton active={tab === "unicode"} onClick={() => setTab("unicode")}>
              Unicode
            </TabButton>
            <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
              Hochladen
            </TabButton>
          </div>

          {tab !== "upload" && (
            <div className="border-b border-line p-2">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen…"
                className="w-full rounded-lg bg-bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand/30"
              />
            </div>
          )}

          <div className="max-h-72 overflow-y-auto p-2">
            {tab === "server" && (
              <>
                {serverEmojis === null ? (
                  <div className="px-3 py-6 text-center text-xs text-ink-muted">Lade…</div>
                ) : filteredServer.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-ink-muted">
                    {search ? "Keine Treffer." : "Server hat noch keine Custom-Emojis."}
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-1">
                    {filteredServer.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => pick(e.mention)}
                        title={`:${e.name}:`}
                        className={`group grid aspect-square place-items-center rounded-md transition-colors hover:bg-bg-hover ${
                          value === e.mention ? "ring-2 ring-brand" : ""
                        }`}
                      >
                        <EmojiDisplay raw={e.mention} size={28} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "unicode" && (
              <div className="grid grid-cols-8 gap-1">
                {filteredUnicode.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => pick(e)}
                    className={`grid aspect-square place-items-center rounded-md text-2xl leading-none transition-colors hover:bg-bg-hover ${
                      value === e ? "ring-2 ring-brand" : ""
                    }`}
                  >
                    {e}
                  </button>
                ))}
                <div className="col-span-8 mt-2 rounded-md border border-line bg-bg-card p-2 text-[10px] text-ink-subtle">
                  Anderes Unicode-Emoji? Einfach in den Hauptfeld eingeben (oder über die System-Emoji-Tastatur).
                </div>
              </div>
            )}

            {tab === "upload" && (
              <EmojiUploader
                suggestedName={suggestedName}
                onUploaded={(mention) => {
                  pick(mention);
                  // Server-Liste invalidieren damit der neue auch in „Server-Emojis" auftaucht
                  setServerEmojis(null);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-b-2 border-brand bg-brand/5 text-ink"
          : "text-ink-muted hover:bg-bg-hover hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
