"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoleOpt } from "./SelfRolesManager";

function intToHex(color: number, fallback = "#a1a1aa"): string {
  if (!color) return fallback;
  return "#" + color.toString(16).padStart(6, "0");
}

interface Props {
  name: string;
  value: string;
  roles: RoleOpt[];
  excludeIds?: string[];
  onChange: (roleId: string, role?: RoleOpt) => void;
  placeholder?: string;
}

export function RolePicker({ name, value, roles, excludeIds = [], onChange, placeholder = "— Rolle wählen —" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = roles.find((r) => r.roleId === value);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles
      .filter((r) => !excludeIds.includes(r.roleId) || r.roleId === value)
      .filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [roles, excludeIds, value, search]);

  return (
    <div className="relative" ref={popoverRef}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-bg-elevated px-4 py-2.5 text-sm shadow-inner transition-colors hover:border-line-strong"
      >
        {selected ? (
          <span
            className="inline-flex items-center gap-2"
            style={{ color: intToHex(selected.color) }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: intToHex(selected.color) }}
            />
            @{selected.name}
          </span>
        ) : (
          <span className="text-ink-subtle">{placeholder}</span>
        )}
        <svg className="h-3.5 w-3.5 text-ink-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-line bg-bg-elevated shadow-card-lg">
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
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-ink-muted">
                Keine Rollen gefunden.
              </div>
            ) : (
              filtered.map((r) => {
                const c = intToHex(r.color);
                const isSelected = r.roleId === value;
                return (
                  <button
                    key={r.roleId}
                    type="button"
                    onClick={() => {
                      onChange(r.roleId, r);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      isSelected ? "bg-brand/10" : "hover:bg-bg-hover"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                    <span className="truncate" style={{ color: c }}>
                      @{r.name}
                    </span>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" className="ml-auto h-3.5 w-3.5 text-brand" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
