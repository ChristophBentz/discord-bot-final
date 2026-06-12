"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { assignRole, removeRole } from "./roleActions";

export interface RoleOption {
  roleId: string;
  name: string;
  color: number;
  /** true wenn die Rolle nicht über das Dashboard vergeben werden darf */
  locked?: boolean;
  /** Grund fürs Sperren (Tooltip) */
  lockReason?: string;
}

function intToHex(color: number, fallback = "#a1a1aa"): string {
  if (!color) return fallback;
  return "#" + color.toString(16).padStart(6, "0");
}

interface Props {
  userId: string;
  currentRoles: RoleOption[];
  allRoles: RoleOption[];
}

export function RolesManager({ userId, currentRoles, allRoles }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentIds = useMemo(() => new Set(currentRoles.map((r) => r.roleId)), [currentRoles]);
  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRoles
      .filter((r) => !currentIds.has(r.roleId))
      .filter((r) => (q ? r.name.toLowerCase().includes(q) : true));
  }, [allRoles, currentIds, search]);

  // Outside-Click schließt das Popover
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const handleRemove = (roleId: string) => {
    setError(null);
    setPendingId(roleId);
    startTransition(async () => {
      const res = await removeRole(userId, roleId);
      if (!res.ok) setError(res.error);
      setPendingId(null);
    });
  };

  const handleAdd = (roleId: string) => {
    setError(null);
    setPendingId(roleId);
    startTransition(async () => {
      const res = await assignRole(userId, roleId);
      if (!res.ok) setError(res.error);
      else {
        setSearch("");
        setOpen(false);
      }
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {currentRoles.length === 0 && (
          <span className="text-sm text-ink-muted">Keine Rollen zugewiesen.</span>
        )}
        {currentRoles.map((r) => {
          const c = intToHex(r.color, "#a1a1aa");
          const removing = pendingId === r.roleId;
          return (
            <span
              key={r.roleId}
              className={`group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-opacity ${
                removing ? "opacity-40" : ""
              }`}
              style={{
                color: c,
                borderColor: c + "55",
                backgroundColor: c + "14",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
              {r.name}
              <button
                type="button"
                onClick={() => handleRemove(r.roleId)}
                disabled={isPending}
                title="Rolle entfernen"
                className="-mr-1 ml-0.5 grid h-4 w-4 place-items-center rounded-full text-current opacity-40 transition-opacity hover:opacity-100 hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </span>
          );
        })}

        {/* "+ Rolle zuweisen"-Button */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line bg-bg-elevated/40 px-2.5 py-1 text-sm font-medium text-ink-muted transition-colors hover:border-brand hover:text-brand"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Rolle zuweisen
          </button>

          {open && (
            <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-line bg-bg-elevated shadow-card-lg">
              <div className="border-b border-line p-2">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rolle suchen…"
                  className="w-full rounded-lg bg-bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {available.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-ink-muted">
                    Keine zuweisbaren Rollen.
                  </div>
                ) : (
                  available.map((r) => {
                    const c = intToHex(r.color, "#a1a1aa");
                    const adding = pendingId === r.roleId;
                    if (r.locked) {
                      return (
                        <div
                          key={r.roleId}
                          title={r.lockReason ?? "Diese Rolle kann nicht über das Dashboard vergeben werden."}
                          className="flex w-full cursor-not-allowed items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm opacity-45"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="11" width="14" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                          </svg>
                          <span className="truncate" style={{ color: c }}>
                            {r.name}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={r.roleId}
                        type="button"
                        onClick={() => handleAdd(r.roleId)}
                        disabled={isPending}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-bg-hover ${
                          adding ? "opacity-40" : ""
                        }`}
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
