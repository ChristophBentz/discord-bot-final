"use client";

import { useRef, useState, useTransition } from "react";
import { useDialog } from "@/components/DialogProvider";
import { addMemberNote, deleteMemberNote } from "./actions";

export interface Note {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function NotesPanel({ userId, notes }: { userId: string; notes: Note[] }) {
  const dialog = useDialog();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await addMemberNote(userId, formData);
      if (res.ok) {
        formRef.current?.reset();
      } else {
        setError(res.error);
      }
    });
  };

  const onDelete = async (noteId: number) => {
    if (
      !(await dialog.confirm({
        title: "Notiz löschen",
        message: "Diese Notiz wird dauerhaft entfernt.",
        confirmLabel: "Löschen",
        danger: true,
      }))
    )
      return;
    startTransition(async () => {
      await deleteMemberNote(noteId, userId);
    });
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {notes.length === 0 && (
          <li className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
            Noch keine Notizen.
          </li>
        )}
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border border-line bg-bg-elevated/40 p-3">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-ink-subtle">
              <span>
                <span className="font-medium text-ink-muted">{formatDate(n.createdAt)}</span>
                {" · "}
                <span>{n.authorName}</span>
              </span>
              <button
                type="button"
                onClick={() => onDelete(n.id)}
                disabled={isPending}
                className="opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100 disabled:opacity-40"
              >
                Löschen
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{n.content}</p>
          </li>
        ))}
      </ul>

      <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
        <textarea
          name="content"
          rows={3}
          placeholder="Notiz hinzufügen…"
          className="input resize-none"
          required
        />
        <div className="flex items-center justify-between gap-3">
          {error ? (
            <span className="text-xs text-rose-400">{error}</span>
          ) : (
            <span className="text-xs text-ink-subtle">Nur für Staff sichtbar.</span>
          )}
          <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
            {isPending ? "Speichere…" : "+ Notiz hinzufügen"}
          </button>
        </div>
      </form>
    </div>
  );
}
