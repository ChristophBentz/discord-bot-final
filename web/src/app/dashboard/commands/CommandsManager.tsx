"use client";

import { useState, useTransition } from "react";
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

export function CommandsManager({ commands, roles }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<CommandSummary | "new" | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-muted">
          {commands.length === 0
            ? "Noch keine Custom-Commands."
            : `${commands.length} Custom-Command${commands.length === 1 ? "" : "s"}`}
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Neuer Command
        </button>
      </div>

      {commands.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-bg-card px-6 py-16 text-center">
          <div className="text-3xl">⚡</div>
          <div className="mt-3 text-sm font-medium text-ink">Keine Custom-Commands</div>
          <p className="mx-auto mt-1 max-w-sm text-xs text-ink-muted">
            Erstelle deinen ersten Command — er wird sofort als echter Slash-Command
            <code className="mx-1 rounded bg-bg-elevated px-1 py-0.5">/...</code>
            bei Discord registriert.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {commands.map((c) => (
            <li
              key={c.name}
              className="group flex flex-col rounded-xl border border-line bg-bg-card p-4 transition-colors hover:border-line-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-semibold text-ink">/{c.name}</code>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                        c.responseType === "embed"
                          ? "bg-purple-500/15 text-purple-300"
                          : "bg-zinc-500/15 text-zinc-300"
                      }`}
                    >
                      {c.responseType}
                    </span>
                    {c.ephemeral && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                        ephemeral
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-xs text-ink-muted">
                    {c.description}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    title="Bearbeiten"
                    className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-muted hover:bg-bg-hover hover:text-ink"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(c.name)}
                    disabled={pending && deletingName === c.name}
                    title="Löschen"
                    className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-muted hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-3 line-clamp-2 rounded bg-bg-elevated/40 px-3 py-2 text-xs text-ink-muted">
                {c.responseType === "embed"
                  ? c.embedDescription || c.embedTitle || c.response || "(leer)"
                  : c.response || "(leer)"}
              </div>
            </li>
          ))}
        </ul>
      )}

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
