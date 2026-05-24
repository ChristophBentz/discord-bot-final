"use client";

import { useState, useTransition } from "react";
import { saveBotDescription } from "./actions";

export function BotDescriptionForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveBotDescription(formData);
      if (result.ok) {
        setFeedback({
          kind: "ok",
          msg: result.description
            ? "Gespeichert. Erscheint in Discord auf dem Bot-Profil."
            : "Beschreibung entfernt.",
        });
      } else {
        setFeedback({ kind: "error", msg: result.error });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="botDescription" className="mb-1.5 block text-sm font-medium text-ink">
          Beschreibung
        </label>
        <textarea
          id="botDescription"
          name="botDescription"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Was macht der Bot?"
          maxLength={400}
          rows={4}
          className="input resize-y"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-ink-subtle">
          <span>
            Wird in Discord auf dem Bot-Profil angezeigt (im „Bot Info"-Tab). Leer = keine Beschreibung.
          </span>
          <span>{value.length} / 400</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
          {isPending ? "Speichere…" : "Speichern"}
        </button>
        {feedback && (
          <span
            className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}
          >
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  );
}
