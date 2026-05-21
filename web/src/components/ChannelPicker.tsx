"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface ChannelOption {
  channelId: string;
  name: string;
  type: number;
  parentId: string | null;
  position?: number;
}

// Discord channel types — relevante:
// 0 = GuildText, 2 = GuildVoice, 4 = GuildCategory,
// 5 = GuildAnnouncement, 13 = GuildStageVoice, 15 = GuildForum, 16 = GuildMedia
const TYPE_PREFIX: Record<number, string> = {
  0: "#",
  2: "🔊",
  4: "📁",
  5: "📣",
  13: "🎤",
  15: "💬",
  16: "🖼️",
};

interface Props {
  /** Wenn gesetzt, wird ein hidden input mit diesem name für Formular-Submits angelegt. */
  name?: string;
  defaultValue?: string | null;
  /** Erlaubt extern gesetzten Wert (überschreibt internen State). */
  value?: string;
  channels: ChannelOption[];
  /** Optionaler Type-Filter — wenn gesetzt, werden nur Channels dieser Typen gezeigt. */
  allowedTypes?: number[];
  placeholder?: string;
  /** Zeigt im Dropdown den „Auswahl entfernen"-Eintrag. */
  allowClear?: boolean;
  /** Standardmäßig nach Kategorie gruppiert. Bei Kategorie-Pickern → false. */
  groupByCategory?: boolean;
  /** Callback bei Änderung. */
  onChange?: (value: string) => void;
}

export function ChannelPicker({
  name,
  defaultValue,
  value,
  channels,
  allowedTypes,
  placeholder = "— Channel wählen —",
  allowClear = true,
  groupByCategory = true,
  onChange,
}: Props) {
  const [internal, setInternal] = useState<string>(defaultValue ?? "");
  const selected = value !== undefined ? value : internal;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const popRef = useRef<HTMLDivElement>(null);

  const allCategories = useMemo(
    () => new Map(channels.filter((c) => c.type === 4).map((c) => [c.channelId, c])),
    [channels],
  );

  const filtered = useMemo(() => {
    let result = channels;
    if (allowedTypes && allowedTypes.length > 0) {
      result = result.filter((c) => allowedTypes.includes(c.type));
    }
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((c) => c.name.toLowerCase().includes(q));
    return result;
  }, [channels, allowedTypes, search]);

  // Gruppierung nach Kategorie (falls aktiviert und nicht selbst Kategorien gepickt werden)
  const groups = useMemo(() => {
    if (!groupByCategory) return null;
    const map = new Map<string, { name: string; items: ChannelOption[] }>();
    const noCat: ChannelOption[] = [];
    for (const c of filtered) {
      if (c.parentId && allCategories.has(c.parentId)) {
        const cat = allCategories.get(c.parentId)!;
        let g = map.get(cat.channelId);
        if (!g) {
          g = { name: cat.name, items: [] };
          map.set(cat.channelId, g);
        }
        g.items.push(c);
      } else {
        noCat.push(c);
      }
    }
    // Sort by category position if available
    const sortedGroups = Array.from(map.entries())
      .map(([id, g]) => ({ ...g, position: allCategories.get(id)?.position ?? 0 }))
      .sort((a, b) => a.position - b.position);
    return { noCat, groups: sortedGroups };
  }, [filtered, groupByCategory, allCategories]);

  const selectedChannel = channels.find((c) => c.channelId === selected);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  const pick = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={popRef}>
      {name && <input type="hidden" name={name} value={selected} />}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-bg-elevated px-4 py-2.5 text-sm text-ink shadow-inner outline-none transition-colors hover:border-line-strong focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
      >
        {selectedChannel ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-ink-subtle">
              {TYPE_PREFIX[selectedChannel.type] ?? "#"}
            </span>
            <span className="truncate">{selectedChannel.name}</span>
          </span>
        ) : (
          <span className="text-ink-subtle">{placeholder}</span>
        )}
        <svg
          className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-xl border border-line bg-bg-elevated shadow-card-lg">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen…"
              className="w-full rounded-lg bg-bg-card px-3 py-2 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {allowClear && selected && (
              <button
                type="button"
                onClick={() => pick("")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-rose-400 transition-colors hover:bg-bg-hover"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
                Auswahl entfernen
              </button>
            )}
            {groups ? (
              <>
                {groups.noCat.length > 0 && (
                  <div>
                    {groups.noCat.map((c) => (
                      <ChannelItem key={c.channelId} c={c} onSelect={pick} />
                    ))}
                  </div>
                )}
                {groups.groups.map((g) => (
                  <div key={g.name}>
                    <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                      {g.name}
                    </div>
                    {g.items.map((c) => (
                      <ChannelItem key={c.channelId} c={c} onSelect={pick} />
                    ))}
                  </div>
                ))}
              </>
            ) : (
              filtered.map((c) => (
                <ChannelItem key={c.channelId} c={c} onSelect={pick} />
              ))
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-ink-muted">
                Keine Channels gefunden.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelItem({
  c,
  onSelect,
}: {
  c: ChannelOption;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(c.channelId)}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-bg-hover"
    >
      <span className="text-ink-subtle">{TYPE_PREFIX[c.type] ?? "#"}</span>
      <span className="truncate">{c.name}</span>
    </button>
  );
}
