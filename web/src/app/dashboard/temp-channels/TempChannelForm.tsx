"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { saveTempChannelSettings } from "./actions";
import { TriggerEditor, type TriggerRow } from "./TriggerEditor";

interface Initial {
  tempChannelEnabled: boolean;
  tempChannelCategoryId: string | null;
  tempChannelNameTemplate: string;
}

interface Props {
  initial: Initial;
  triggers: TriggerRow[];
  channels: ChannelOption[];
}

const PLACEHOLDERS = ["{nick}", "{user}"];

export function TempChannelForm({ initial, triggers, channels }: Props) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.tempChannelEnabled);
  const [categoryId, setCategoryId] = useState(initial.tempChannelCategoryId ?? "");
  const [template, setTemplate] = useState(initial.tempChannelNameTemplate);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveTempChannelSettings(formData);
      setFeedback(
        res.ok ? { kind: "ok", msg: "Gespeichert." } : { kind: "error", msg: res.error },
      );
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FeatureSubCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        }
        title="Temp-Voice-Channels"
        description="Bot erstellt private Voice-Channels wenn jemand einen Trigger-Channel betritt."
        enabled={enabled}
        toggleName="tempChannelEnabled"
        onToggleChange={setEnabled}
        tone="emerald"
      >
        {enabled && (
          <div className="space-y-4">
            <FormField
              label="Kategorie (optional)"
              hint="Wenn gesetzt, werden neue Temp-Channels unter dieser Kategorie angelegt. Sonst nutzt der Bot die Kategorie des Trigger-Channels."
            >
              <ChannelPicker
                name="tempChannelCategoryId"
                defaultValue={initial.tempChannelCategoryId}
                value={categoryId}
                channels={channels}
                allowedTypes={[4]}
                groupByCategory={false}
                placeholder="— Keine, nutze Kategorie des Trigger-Channels —"
                onChange={setCategoryId}
              />
            </FormField>

            <FormField label="Default Name-Template">
              <input
                name="tempChannelNameTemplate"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                maxLength={90}
                className="input"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                  Platzhalter
                </span>
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTemplate((t) => t + p)}
                    title="Einfügen"
                    className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted hover:bg-bg-hover hover:text-ink"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-subtle">
                Wird genutzt, wenn ein Trigger kein eigenes Template hat.
              </p>
            </FormField>

            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span>
                Bot braucht <span className="font-mono">Manage Channels</span> +{" "}
                <span className="font-mono">Move Members</span>. Der Owner des Temp-Channels
                bekommt Manage/Mute/Move-Permissions für seinen Channel.
              </span>
            </div>
          </div>
        )}
      </FeatureSubCard>

      <FeatureSubCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        }
        title="Trigger-Channels"
        description="Welche Voice-Channels Temp-Erstellung auslösen — mit eigenem User-Limit pro Trigger."
        staticActive
        tone="brand"
        stat={`${triggers.length} ${triggers.length === 1 ? "Trigger" : "Trigger"}`}
      >
        <TriggerEditor triggers={triggers} channels={channels} />
      </FeatureSubCard>

      {!enabled && (
        <>
          <input type="hidden" name="tempChannelCategoryId" value={categoryId} />
          <input type="hidden" name="tempChannelNameTemplate" value={template} />
        </>
      )}

      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border border-line bg-bg-card/95 px-5 py-3 shadow-card-lg backdrop-blur">
        <span className="text-xs text-ink-subtle">
          Änderungen werden nach „Speichern" übernommen.
        </span>
        <div className="flex items-center gap-3">
          {feedback && (
            <span
              className={`text-sm ${
                feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {feedback.msg}
            </span>
          )}
          <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
            {isPending ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>
    </form>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

interface SubCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled?: boolean;
  toggleName?: string;
  onToggleChange?: (v: boolean) => void;
  tone: "emerald" | "brand" | "amber" | "purple";
  staticActive?: boolean;
  stat?: string;
  children?: ReactNode;
}

function FeatureSubCard({
  icon,
  title,
  description,
  enabled,
  toggleName,
  onToggleChange,
  tone,
  staticActive,
  stat,
  children,
}: SubCardProps) {
  const showActive = staticActive || enabled;
  const toneClass = showActive
    ? tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/[0.04]"
      : tone === "brand"
        ? "border-brand/30 bg-brand/[0.04]"
        : tone === "amber"
          ? "border-amber-500/30 bg-amber-500/[0.04]"
          : "border-purple-500/30 bg-purple-500/[0.04]"
    : "border-line bg-bg-elevated/40";
  const iconClass = showActive
    ? tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-400"
      : tone === "brand"
        ? "bg-brand/15 text-brand-light"
        : tone === "amber"
          ? "bg-amber-500/15 text-amber-400"
          : "bg-purple-500/15 text-purple-400"
    : "bg-zinc-500/10 text-zinc-500";

  return (
    <div className={`rounded-2xl border p-5 transition-colors ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconClass}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-ink">{title}</div>
              {stat && (
                <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] text-ink-muted">
                  {stat}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">{description}</div>
          </div>
        </div>
        {toggleName && (
          <>
            <input
              type="checkbox"
              name={toggleName}
              checked={enabled ?? false}
              onChange={(e) => onToggleChange?.(e.target.checked)}
              className="sr-only"
            />
            <span
              onClick={() => onToggleChange?.(!enabled)}
              className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-zinc-700 transition-colors"
              style={{ background: enabled ? "rgb(16 185 129)" : undefined }}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-4" : ""
                }`}
              />
            </span>
          </>
        )}
      </div>
      {children && (
        <div className="mt-4 border-t border-line/60 pt-4">{children}</div>
      )}
    </div>
  );
}
