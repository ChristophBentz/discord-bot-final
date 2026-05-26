"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CommandEditor } from "./CommandEditor";
import { deleteCommand, type CommandFormState } from "./actions";

export interface CommandSummary {
  name: string;
  description: string;
  responseType: "text" | "embed";
  response: string;
  embedTitle: string | null;
  embedDescription: string | null;
  embedColor: number | null;
  embedImageUrl: string | null;
  embedFooter: string | null;
  ephemeral: boolean;
  allowedRoleIds: string;
  updatedAt: string;
}

interface RoleOpt {
  roleId: string;
  name: string;
  color: number;
}

interface Props {
  commands: CommandSummary[];
  roles: RoleOpt[];
  roleMap: Record<string, { name: string; color: number }>;
}

function intToHex(n: number | null): string {
  if (n === null) return "#a855f7";
  return "#" + n.toString(16).padStart(6, "0");
}

function summaryToForm(c: CommandSummary): CommandFormState {
  return {
    name: c.name,
    description: c.description,
    responseType: c.responseType,
    response: c.response,
    embedTitle: c.embedTitle ?? "",
    embedDescription: c.embedDescription ?? "",
    embedColor: intToHex(c.embedColor),
    embedImageUrl: c.embedImageUrl ?? "",
    embedFooter: c.embedFooter ?? "",
    ephemeral: c.ephemeral,
    allowedRoleIds: c.allowedRoleIds.split(",").filter(Boolean),
  };
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vor ${d} Tg`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

export function CommandsManager({ commands, roles, roleMap }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<CommandSummary | "new" | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) => c.name.includes(q) || c.description.toLowerCase().includes(q),
    );
  }, [commands, query]);

  const embedCount = commands.filter((c) => c.responseType === "embed").length;
  const gatedCount = commands.filter((c) => c.allowedRoleIds.trim().length > 0).length;
  const ephemeralCount = commands.filter((c) => c.ephemeral).length;

  function confirmDelete(name: string) {
    if (!confirm(`Command /${name} wirklich löschen?`)) return;
    setDeletingName(name);
    startTransition(async () => {
      await deleteCommand(name);
      setDeletingName(null);
      router.refresh();
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-ink-muted">
          <span>
            <span className="font-medium text-ink tabular-nums">{commands.length}</span>{" "}
            {commands.length === 1 ? "Command" : "Commands"}
          </span>
          {embedCount > 0 && (
            <span>
              <span className="font-medium text-ink tabular-nums">{embedCount}</span> mit Embed
            </span>
          )}
          {ephemeralCount > 0 && (
            <span>
              <span className="font-medium text-ink tabular-nums">{ephemeralCount}</span>{" "}
              ephemeral
            </span>
          )}
          {gatedCount > 0 && (
            <span>
              <span className="font-medium text-ink tabular-nums">{gatedCount}</span>{" "}
              rollenbeschränkt
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {commands.length > 4 && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen…"
              className="w-44 rounded-md border border-line bg-bg-elevated px-3 py-1.5 text-sm placeholder:text-ink-subtle focus:border-brand focus:outline-none"
            />
          )}
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-bg-base hover:bg-white"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Neuer Command
          </button>
        </div>
      </div>

      {commands.length === 0 ? (
        <EmptyState onCreate={() => setEditing("new")} />
      ) : (
        <ul className="divide-y divide-line border-b border-line">
          {filtered.map((c) => (
            <CommandRow
              key={c.name}
              cmd={c}
              roleMap={roleMap}
              isDeleting={deletingName === c.name && pending}
              onEdit={() => setEditing(c)}
              onDelete={() => confirmDelete(c.name)}
            />
          ))}
          {filtered.length === 0 && (
            <li className="py-8 text-center text-sm text-ink-subtle">
              Keine Treffer für „{query}".
            </li>
          )}
        </ul>
      )}

      {/* Hilfe-Sektion */}
      {commands.length > 0 && <PlaceholderRef />}

      {editing !== null && (
        <CommandEditor
          initial={editing === "new" ? undefined : summaryToForm(editing)}
          originalName={editing === "new" ? undefined : editing.name}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function CommandRow({
  cmd,
  roleMap,
  isDeleting,
  onEdit,
  onDelete,
}: {
  cmd: CommandSummary;
  roleMap: Record<string, { name: string; color: number }>;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const roleIds = cmd.allowedRoleIds.split(",").filter(Boolean);
  const accentColor =
    cmd.responseType === "embed" && cmd.embedColor !== null
      ? `#${cmd.embedColor.toString(16).padStart(6, "0")}`
      : null;

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onEdit}
        disabled={isDeleting}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 py-3.5 text-left transition-colors hover:bg-bg-card/40 disabled:opacity-40"
      >
        {/* Color-Indicator */}
        <span
          className="h-8 w-[2px] shrink-0 rounded-full"
          style={{ backgroundColor: accentColor ?? "rgba(255,255,255,0.08)" }}
        />

        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <code className="font-mono text-sm font-semibold text-ink">/{cmd.name}</code>
            <span className="text-[11px] text-ink-subtle">
              {cmd.responseType === "embed" ? "Embed" : "Text"}
              {cmd.ephemeral && " · ephemeral"}
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs text-ink-muted">{cmd.description}</div>

          {roleIds.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-subtle">
                Nur:
              </span>
              {roleIds.slice(0, 3).map((id) => {
                const r = roleMap[id];
                if (!r) return null;
                const color = r.color
                  ? `#${r.color.toString(16).padStart(6, "0")}`
                  : "#a1a1aa";
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded text-[11px] text-ink-muted"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {r.name}
                  </span>
                );
              })}
              {roleIds.length > 3 && (
                <span className="text-[11px] text-ink-subtle">
                  + {roleIds.length - 3} weitere
                </span>
              )}
            </div>
          )}
        </div>

        <span className="text-[11px] text-ink-subtle tabular-nums">
          {formatRelative(cmd.updatedAt)}
        </span>
      </button>

      {/* Action-Buttons rechts, nur bei Hover sichtbar */}
      <div className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-1 pr-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 sm:flex">
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          title="Löschen"
          className="grid h-7 w-7 place-items-center rounded-md text-ink-subtle hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>
    </li>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-line bg-bg-card/40 px-6 py-16 text-center">
      <h2 className="text-base font-medium text-ink">Noch keine Custom-Commands</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        Lege deinen ersten an — er erscheint sofort als Slash-Command in Discord,
        inklusive Autocomplete und Beschreibung.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-bg-base hover:bg-white"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Ersten Command anlegen
      </button>
    </div>
  );
}

function PlaceholderRef() {
  const items: [string, string][] = [
    ["{user}", "Anzeigename des Aufrufers"],
    ["{user.mention}", "@-Mention"],
    ["{user.id}", "Discord-User-ID"],
    ["{server}", "Server-Name"],
    ["{channel}", "Channel-Name"],
    ["{random:a|b|c}", "zufällige Auswahl"],
  ];
  return (
    <details className="rounded-lg border border-line bg-bg-card/40 p-4 text-sm">
      <summary className="cursor-pointer select-none text-ink-muted hover:text-ink">
        Platzhalter
      </summary>
      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-xs">
        {items.map(([key, desc]) => (
          <div key={key} className="contents">
            <dt>
              <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink">
                {key}
              </code>
            </dt>
            <dd className="text-ink-muted">{desc}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
