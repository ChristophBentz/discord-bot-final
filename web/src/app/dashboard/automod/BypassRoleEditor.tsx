"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBypassRole, removeBypassRole } from "./actions";

export interface BypassRoleOption {
  roleId: string;
  name: string;
  color: number;
}

function intToHex(color: number, fallback = "#a1a1aa"): string {
  if (!color) return fallback;
  return "#" + color.toString(16).padStart(6, "0");
}

interface Props {
  current: BypassRoleOption[];
  available: BypassRoleOption[];
}

export function BypassRoleEditor({ current, available }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const popRef = useRef<HTMLDivElement>(null);

  const currentIds = useMemo(() => new Set(current.map((r) => r.roleId)), [current]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return available
      .filter((r) => !currentIds.has(r.roleId))
      .filter((r) => (q ? r.name.toLowerCase().includes(q) : true));
  }, [available, currentIds, search]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  const onAdd = (roleId: string) => {
    setError(null);
    setPendingId(roleId);
    startTransition(async () => {
      const res = await addBypassRole(roleId);
      if (res.ok) {
        setOpen(false);
        setSearch("");
        router.refresh();
      } else {
        setError(res.error);
      }
      setPendingId(null);
    });
  };

  const onRemove = (roleId: string) => {
    setPendingId(roleId);
    startTransition(async () => {
      await removeBypassRole(roleId);
      router.refresh();
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {current.length === 0 && (
          <span className="text-sm text-ink-muted">
            Keine Rolle ausgenommen — niemand wird vom Filter befreit.
          </span>
        )}
        {current.map((r) => {
          const c = intToHex(r.color, "#a1a1aa");
          return (
            <span
              key={r.roleId}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-opacity ${
                pendingId === r.roleId ? "opacity-40" : ""
              }`}
              style={{ color: c, borderColor: c + "55", backgroundColor: c + "14" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
              {r.name}
              <button
                type="button"
                onClick={() => onRemove(r.roleId)}
                disabled={isPending}
                className="-mr-1 ml-0.5 grid h-4 w-4 place-items-center rounded-full opacity-40 transition-opacity hover:opacity-100 hover:bg-white/10"
                title="Entfernen"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </span>
          );
        })}

        <div className="relative" ref={popRef}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line bg-bg-elevated/40 px-2.5 py-1 text-sm font-medium text-ink-muted transition-colors hover:border-brand hover:text-brand"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Rolle hinzufügen
          </button>

          {open && (
            <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-line bg-bg-elevated shadow-card-lg">
              <div className="border-b border-line p-2">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rolle suchen…"
                  className="w-full rounded-lg bg-bg-card px-3 py-2 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-ink-muted">
                    Keine Rollen verfügbar.
                  </div>
                ) : (
                  filtered.map((r) => {
                    const c = intToHex(r.color, "#a1a1aa");
                    const adding = pendingId === r.roleId;
                    return (
                      <button
                        key={r.roleId}
                        type="button"
                        onClick={() => onAdd(r.roleId)}
                        disabled={isPending}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-bg-hover ${adding ? "opacity-40" : ""}`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                        <span className="truncate" style={{ color: c }}>
                          {r.name}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}
    </div>
  );
}
