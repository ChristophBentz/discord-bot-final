"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAchievement } from "./actions";

const TRIGGERS = [
  { value: "manual", label: "Manuell", hint: "Vergibt nur per Hand vom Admin." },
  { value: "level", label: "Level X erreicht", hint: "Wert = Level (z.B. 10)." },
  { value: "messages", label: "X Nachrichten", hint: "Wert = Anzahl Nachrichten." },
  { value: "voice", label: "X Stunden Voice", hint: "Wert = Stunden Voice-Zeit." },
  { value: "xp", label: "X XP gesammelt", hint: "Wert = Gesamt-XP." },
] as const;

export function CreateAchievementForm() {
  const router = useRouter();
  const [triggerType, setTriggerType] = useState("manual");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const trigger = TRIGGERS.find((t) => t.value === triggerType)!;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await createAchievement(formData);
      if (res.ok) {
        setSuccess(true);
        formRef.current?.reset();
        setTriggerType("manual");
        // Server-Component-Liste neu rendern, damit das neue Achievement auftaucht
        router.refresh();
        setTimeout(() => setSuccess(false), 2500);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Name</span>
          <input
            name="name"
            type="text"
            required
            maxLength={80}
            placeholder="z.B. Erster Schritt"
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Trigger-Typ</span>
          <select
            name="triggerType"
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="input"
          >
            {TRIGGERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Nachricht</span>
        <textarea
          name="description"
          required
          rows={3}
          maxLength={500}
          placeholder="z.B. Du hast deine erste Nachricht geschrieben — willkommen!"
          className="input resize-none"
        />
      </label>

      {triggerType !== "manual" && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Trigger-Wert</span>
          <input
            name="triggerValue"
            type="number"
            min={1}
            defaultValue={1}
            required
            className="input"
          />
          <span className="mt-1.5 block text-xs text-ink-subtle">{trigger.hint}</span>
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Bild (optional)</span>
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-bg-elevated file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-muted hover:file:bg-bg-hover file:hover:text-ink"
        />
        <span className="mt-1.5 block text-xs text-ink-subtle">
          PNG / JPG / WEBP / GIF · max. 2 MB. Wird im Embed als Thumbnail angezeigt.
        </span>
      </label>

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          ✓ Achievement angelegt.
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
          {isPending ? "Speichere…" : "Achievement anlegen"}
        </button>
      </div>
    </form>
  );
}
