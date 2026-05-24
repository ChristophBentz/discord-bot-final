"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { MessagePreview } from "@/components/MessagePreview";
import { saveWelcomeSettings } from "./actions";
import { AutoRoleEditor, type AutoRoleOption } from "./AutoRoleEditor";

interface Initial {
  welcomeEnabled: boolean;
  welcomeChannelId: string | null;
  welcomeMessage: string | null;
  leaveEnabled: boolean;
  leaveChannelId: string | null;
  leaveMessage: string | null;
  autoRolesEnabled: boolean;
}

interface Props {
  initial: Initial;
  currentAutoRoles: AutoRoleOption[];
  availableRoles: AutoRoleOption[];
  channels: ChannelOption[];
  bot: { name: string; avatarUrl: string | null };
}

function previewRender(
  template: string,
  args: { username: string; memberCount: number; serverName: string },
): string {
  return template
    .replaceAll("{user}", `@${args.username}`)
    .replaceAll("{username}", args.username)
    .replaceAll("{memberCount}", String(args.memberCount))
    .replaceAll("{server}", args.serverName);
}

const WELCOME_PRESETS = [
  { label: "Klassisch", text: "Willkommen {user} auf {server}! 🎉 Schön dich hier zu haben." },
  { label: "Mit Counter", text: "Hey {user}, willkommen auf {server}! Du bist Member Nr. {memberCount}." },
  { label: "Freundlich", text: "Hallo {username}! 👋 Viel Spaß auf {server} — schau gerne in #rules vorbei." },
  { label: "Cinematisch", text: "Eine neue Hoffnung erscheint. {user} ist {server} beigetreten." },
  { label: "Knapp", text: "Willkommen, {user}!" },
];

const LEAVE_PRESETS = [
  { label: "Knapp", text: "{username} hat den Server verlassen." },
  { label: "Freundlich", text: "Auf Wiedersehen, {username}. Komm bald wieder! 👋" },
  { label: "Mit Counter", text: "{username} ist gegangen — wir sind noch {memberCount} Member." },
  { label: "Cinematisch", text: "Eine Tür schließt sich: {username} hat {server} verlassen." },
];

const PLACEHOLDERS = ["{user}", "{username}", "{server}", "{memberCount}"];

export function WelcomeForm({ initial, currentAutoRoles, availableRoles, channels, bot }: Props) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [welcomeOn, setWelcomeOn] = useState(initial.welcomeEnabled);
  const [leaveOn, setLeaveOn] = useState(initial.leaveEnabled);
  const [autoRolesOn, setAutoRolesOn] = useState(initial.autoRolesEnabled);

  const [welcomeChannelId, setWelcomeChannelId] = useState(initial.welcomeChannelId ?? "");
  const [welcomeMsg, setWelcomeMsg] = useState(initial.welcomeMessage ?? "");
  const [leaveChannelId, setLeaveChannelId] = useState(initial.leaveChannelId ?? "");
  const [leaveMsg, setLeaveMsg] = useState(initial.leaveMessage ?? "");

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveWelcomeSettings(formData);
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6M23 11h-6" />
          </svg>
        }
        title="Begrüßung"
        description="Bot postet einen Embed wenn jemand dem Server beitritt."
        enabled={welcomeOn}
        toggleName="welcomeEnabled"
        onToggleChange={setWelcomeOn}
        tone="emerald"
      >
        {welcomeOn && (
          <div className="space-y-4">
            <FormField label="Channel">
              <ChannelPicker
                name="welcomeChannelId"
                defaultValue={initial.welcomeChannelId}
                value={welcomeChannelId}
                channels={channels}
                allowedTypes={[0, 5]}
                placeholder="— Welcome-Channel wählen —"
                onChange={setWelcomeChannelId}
              />
            </FormField>

            <FormField label="Nachricht">
              <PresetRow
                presets={WELCOME_PRESETS}
                active={welcomeMsg}
                onPick={setWelcomeMsg}
              />
              <textarea
                name="welcomeMessage"
                rows={3}
                maxLength={1500}
                value={welcomeMsg}
                onChange={(e) => setWelcomeMsg(e.target.value)}
                placeholder="Willkommen {user} auf {server}! Du bist Member #{memberCount}."
                className="input mt-2 resize-y"
              />
              <PlaceholderHint onInsert={(p) => setWelcomeMsg((m) => m + p)} />
            </FormField>

            <MessagePreview
              text={previewRender(welcomeMsg, {
                username: "Max",
                memberCount: 250,
                serverName: "Mein Server",
              })}
              botName={bot.name}
              botAvatarUrl={bot.avatarUrl}
              hint='Beispieldaten: User „Max", Member #250'
            />
          </div>
        )}
      </FeatureSubCard>

      <FeatureSubCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M17 8l5 5M22 8l-5 5" />
          </svg>
        }
        title="Verabschiedung"
        description="Bot postet einen Embed wenn jemand den Server verlässt."
        enabled={leaveOn}
        toggleName="leaveEnabled"
        onToggleChange={setLeaveOn}
        tone="rose"
      >
        {leaveOn && (
          <div className="space-y-4">
            <FormField label="Channel">
              <ChannelPicker
                name="leaveChannelId"
                defaultValue={initial.leaveChannelId}
                value={leaveChannelId}
                channels={channels}
                allowedTypes={[0, 5]}
                placeholder="— Leave-Channel wählen —"
                onChange={setLeaveChannelId}
              />
            </FormField>

            <FormField label="Nachricht">
              <PresetRow
                presets={LEAVE_PRESETS}
                active={leaveMsg}
                onPick={setLeaveMsg}
              />
              <textarea
                name="leaveMessage"
                rows={3}
                maxLength={1500}
                value={leaveMsg}
                onChange={(e) => setLeaveMsg(e.target.value)}
                placeholder="{username} hat den Server verlassen."
                className="input mt-2 resize-y"
              />
              <PlaceholderHint onInsert={(p) => setLeaveMsg((m) => m + p)} />
            </FormField>

            <MessagePreview
              text={previewRender(leaveMsg, {
                username: "Max",
                memberCount: 249,
                serverName: "Mein Server",
              })}
              botName={bot.name}
              botAvatarUrl={bot.avatarUrl}
              hint='Beispieldaten: User „Max"'
            />
          </div>
        )}
      </FeatureSubCard>

      <FeatureSubCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M20.59 13.41a2 2 0 0 1 0 2.83l-5.66 5.66a2 2 0 0 1-2.83 0L2.5 12.3V2.5h9.8l8.29 8.29a2 2 0 0 1 0 2.62z" />
            <circle cx="7" cy="7" r="1.5" />
          </svg>
        }
        title="Auto-Rollen"
        description="Jeder neue Member bekommt diese Rollen automatisch."
        enabled={autoRolesOn}
        toggleName="autoRolesEnabled"
        onToggleChange={setAutoRolesOn}
        tone="purple"
        stat={
          autoRolesOn && currentAutoRoles.length > 0
            ? `${currentAutoRoles.length} Rolle${currentAutoRoles.length === 1 ? "" : "n"} ausgewählt`
            : undefined
        }
      >
        {autoRolesOn && (
          <div className="space-y-3">
            <AutoRoleEditor current={currentAutoRoles} available={availableRoles} />
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span>
                Die Bot-Rolle muss in der Rollen-Hierarchie höher sein als die Auto-Rollen — sonst
                kann Discord sie nicht vergeben.
              </span>
            </div>
          </div>
        )}
      </FeatureSubCard>

      {/* Hidden inputs für Off-Subfeatures, damit Werte nicht verloren gehen */}
      {!welcomeOn && (
        <>
          <input type="hidden" name="welcomeChannelId" value={welcomeChannelId} />
          <input type="hidden" name="welcomeMessage" value={welcomeMsg} />
        </>
      )}
      {!leaveOn && (
        <>
          <input type="hidden" name="leaveChannelId" value={leaveChannelId} />
          <input type="hidden" name="leaveMessage" value={leaveMsg} />
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

// ─── Sub-Components ────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

function PresetRow({
  presets,
  active,
  onPick,
}: {
  presets: { label: string; text: string }[];
  active: string;
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
        Vorlagen
      </span>
      {presets.map((p) => {
        const isActive = active.trim() === p.text.trim();
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onPick(p.text)}
            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
              isActive
                ? "border-brand/40 bg-brand-subtle text-brand"
                : "border-line bg-bg-elevated text-ink-muted hover:bg-bg-hover hover:text-ink"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function PlaceholderHint({ onInsert }: { onInsert: (p: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
        Platzhalter
      </span>
      {PLACEHOLDERS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onInsert(p)}
          title="In Text einfügen"
          className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted transition-colors hover:bg-bg-hover hover:text-ink"
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ─── Feature-Sub-Card (wiederverwendbar — wie in AutoMod) ─────────────────
interface SubCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  toggleName: string;
  onToggleChange: (v: boolean) => void;
  tone: "emerald" | "rose" | "purple";
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
  stat,
  children,
}: SubCardProps) {
  const toneClass = enabled
    ? tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/[0.04]"
      : tone === "rose"
        ? "border-rose-500/30 bg-rose-500/[0.04]"
        : "border-purple-500/30 bg-purple-500/[0.04]"
    : "border-line bg-bg-elevated/40";
  const iconClass = enabled
    ? tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-400"
      : tone === "rose"
        ? "bg-rose-500/15 text-rose-400"
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
        <input
          type="checkbox"
          name={toggleName}
          checked={enabled}
          onChange={(e) => onToggleChange(e.target.checked)}
          className="peer/r sr-only"
        />
        <span
          onClick={() => onToggleChange(!enabled)}
          className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-zinc-700 transition-colors"
          style={{ background: enabled ? "rgb(16 185 129)" : undefined }}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-4" : ""
            }`}
          />
        </span>
      </div>
      {enabled && children && (
        <div className="mt-5 border-t border-line/60 pt-5">{children}</div>
      )}
    </div>
  );
}
