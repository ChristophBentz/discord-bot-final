"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { globalSearch, type SearchResult } from "@/app/dashboard/searchActions";

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  member: "Mitglieder",
  channel: "Channels",
  page: "Seiten",
};

const TYPE_ORDER: SearchResult["type"][] = ["page", "member", "channel"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [isLoading, startLoad] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      startLoad(async () => {
        const r = await globalSearch(query);
        setResults(r);
        setSelected(0);
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[selected];
      if (target) navigate(target.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  // Gruppieren nach Type, in der definierten Reihenfolge
  const grouped: Array<{ type: SearchResult["type"]; items: SearchResult[] }> = [];
  for (const type of TYPE_ORDER) {
    const items = results.filter((r) => r.type === type);
    if (items.length > 0) grouped.push({ type, items });
  }

  // Sequenzieller Index für Pfeiltasten
  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Such-Input */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Mitglieder, Channels oder Seiten suchen…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-ink-muted"
          >
            Esc
          </button>
        </div>

        {/* Ergebnisse */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() ? (
            <div className="px-4 py-8 text-center text-sm text-ink-subtle">
              Tippen, um in Mitgliedern, Channels und Dashboard-Seiten zu suchen.
            </div>
          ) : isLoading && results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-subtle">Suche…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-subtle">
              Keine Treffer für „{query}".
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.type}>
                <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                  {TYPE_LABEL[group.type]}
                </div>
                {group.items.map((item) => {
                  flatIdx += 1;
                  const isSelected = flatIdx === selected;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelected(flatIdx)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                        isSelected ? "bg-brand/10 text-ink" : "text-ink-muted hover:bg-bg-hover"
                      }`}
                    >
                      {item.type === "member" && item.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.avatarUrl}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-full ring-1 ring-line"
                        />
                      ) : item.type === "member" ? (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                          {item.title[0]?.toUpperCase() ?? "?"}
                        </span>
                      ) : (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line bg-bg-elevated text-ink-muted">
                          {item.type === "page" ? (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <path d="M3 9h18" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          )}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{item.title}</div>
                        {item.subtitle && (
                          <div className="truncate text-xs text-ink-subtle">{item.subtitle}</div>
                        )}
                      </div>
                      {item.hint && (
                        <span className="rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          {item.hint}
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] text-ink-subtle">↵</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line bg-bg-elevated/40 px-3 py-2 text-[10px] text-ink-subtle">
          <span className="flex items-center gap-2">
            <span>↑↓ Navigieren</span>
            <span>·</span>
            <span>↵ Öffnen</span>
            <span>·</span>
            <span>Esc Schließen</span>
          </span>
          {results.length > 0 && <span>{results.length} Treffer</span>}
        </div>
      </div>
    </div>
  );
}
