"use client";

import { useState, useTransition } from "react";
import { saveBotNickname } from "./actions";

export function BotNicknameForm({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveBotNickname(formData);
      if (result.ok) {
        setFeedback({
          kind: "ok",
          msg: result.nickname
            ? `Nickname auf „${result.nickname}" gesetzt.`
            : "Nickname entfernt — Bot zeigt jetzt seinen globalen Username.",
        });
      } else {
        setFeedback({ kind: "error", msg: result.error });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="botNickname" className="mb-1.5 block text-sm font-medium text-ink">
          Server-Nickname
        </label>
        <input
          id="botNickname"
          name="botNickname"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z.B. Harald"
          maxLength={32}
          className="input"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-ink-subtle">
          <span>
            Wie der Bot auf diesem Server angezeigt wird. Leer = globaler Username.
          </span>
          <span>{value.length} / 32</span>
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
