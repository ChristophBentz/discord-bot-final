"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAppeal } from "./actions";

export function AppealForm({ userId, appealKey }: { userId: string; appealKey: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await submitAppeal(userId, appealKey, formData);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <textarea
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        maxLength={2000}
        required
        placeholder="Was ist passiert? Warum sollte der Ban aufgehoben werden?"
        className="w-full rounded-xl border border-line bg-bg-elevated/50 p-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-ink-subtle">{text.trim().length}/2000 Zeichen</span>
        <button
          type="submit"
          disabled={pending || text.trim().length < 20}
          className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Wird gesendet…" : "Antrag einreichen"}
        </button>
      </div>
      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}
