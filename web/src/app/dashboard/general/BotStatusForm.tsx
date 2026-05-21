"use client";

import { useState, useTransition } from "react";
import { saveBotStatus } from "./actions";

export function BotStatusForm({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveBotStatus(formData);
      if (result.ok) {
        setFeedback({
          kind: "ok",
          msg: result.text
            ? "Gespeichert. In den nächsten 15 Sekunden in Discord sichtbar."
            : "Status entfernt.",
        });
      } else {
        setFeedback({ kind: "error", msg: result.error });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="botStatusText" className="mb-1.5 block text-sm font-medium text-ink">
          Status-Text
        </label>
        <input
          id="botStatusText"
          name="botStatusText"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z.B. Hilft beim Aufräumen"
          maxLength={128}
          className="input"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-ink-subtle">
          <span>Leer lassen, um den Status zu entfernen.</span>
          <span>{value.length} / 128</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
          {isPending ? "Speichere…" : "Speichern"}
        </button>
        {feedback && (
          <span className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  );
}
