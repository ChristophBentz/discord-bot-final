"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAchievement } from "./actions";

export interface AchievementItem {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  triggerType: string;
  triggerValue: number;
  awardsCount: number;
}

const TRIGGER_LABEL: Record<string, (v: number) => string> = {
  manual: () => "Nur manuell",
  level: (v) => `Bei Level ${v}`,
  messages: (v) => `${v.toLocaleString("de-DE")} Nachrichten`,
  voice: (v) => `${v}h Voice`,
  xp: (v) => `${v.toLocaleString("de-DE")} XP`,
};

const TRIGGER_TONE: Record<string, string> = {
  manual: "border-icon-slate-bg text-icon-slate-fg",
  level: "border-icon-amber-bg text-icon-amber-fg",
  messages: "border-icon-blue-bg text-icon-blue-fg",
  voice: "border-icon-pink-bg text-icon-pink-fg",
  xp: "border-icon-violet-bg text-icon-violet-fg",
};

export function AchievementCard({ a }: { a: AchievementItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    if (!confirm(`Achievement "${a.name}" löschen?`)) return;
    startTransition(async () => {
      await deleteAchievement(a.id);
      router.refresh();
    });
  };

  const label = (TRIGGER_LABEL[a.triggerType] ?? ((v: number) => String(v)))(a.triggerValue);
  const tone = TRIGGER_TONE[a.triggerType] ?? "border-line text-ink-muted";

  return (
    <div className={`card flex gap-4 p-4 transition-opacity ${isPending ? "opacity-40" : ""}`}>
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-bg-elevated">
        {a.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.imageUrl} alt={a.name} className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold">{a.name}</h3>
          <span className={`rounded-md border bg-bg-elevated/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
            {label}
          </span>
          {a.awardsCount > 0 && (
            <span className="rounded-md bg-bg-elevated/60 px-2 py-0.5 text-[10px] font-mono text-ink-muted">
              {a.awardsCount}× vergeben
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{a.description}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="shrink-0 self-start rounded-lg px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
      >
        Löschen
      </button>
    </div>
  );
}
