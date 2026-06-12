"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { MessagePreview } from "@/components/MessagePreview";
import { PlatformLogo } from "@/components/PlatformLogo";
import { checkNow, saveFreeGamesSettings } from "./actions";

interface Initial {
  freeGamesEnabled: boolean;
  freeGamesChannelId: string | null;
  freeGamesEpic: boolean;
  freeGamesSteam: boolean;
  freeGamesGog: boolean;
  freeGamesConsole: boolean;
  freeGamesIncludeGames: boolean;
  freeGamesIncludeDlc: boolean;
  freeGamesIncludeLoot: boolean;
  freeGamesMessage: string | null;
  freeGamesPingRoleId: string | null;
  freeGamesFooterText: string | null;
  freeGamesLastCheck: Date | null;
}

export interface RoleOption {
  roleId: string;
  name: string;
  color: number;
}

interface Props {
  initial: Initial;
  channels: ChannelOption[];
  roles: RoleOption[];
  bot: { name: string; avatarUrl: string | null };
}

const MESSAGE_PRESETS = [
  { label: "Neutral", text: "🎮 Frische kostenlose Spiele für euch:" },
  { label: "Mit Ping", text: "{role} 🆓 Neue Free Games sind da — schnappt sie euch:" },
  { label: "Anzahl + Ping", text: "{role} 💰 {count} neue Aktionen verfügbar:" },
  { label: "Hype", text: "🔔 **FREE-GAME-ALARM!** {role} Schnell zugreifen ⬇️" },
  { label: "Kurz", text: "Neue Free Games:" },
];

const PLACEHOLDERS = ["{role}", "{count}"];

function intToHex(color: number, fallback = "#a1a1aa"): string {
  if (!color) return fallback;
  return "#" + color.toString(16).padStart(6, "0");
}

const SOURCES: { key: keyof Initial; label: string; platform: string; sub: string }[] = [
  { key: "freeGamesEpic", label: "Epic Games Store", platform: "epic", sub: "epicgames.com" },
  { key: "freeGamesSteam", label: "Steam", platform: "steam", sub: "store.steampowered.com" },
  { key: "freeGamesGog", label: "GOG", platform: "gog", sub: "gog.com" },
  { key: "freeGamesConsole", label: "Konsolen", platform: "console", sub: "PlayStation / Xbox / Switch" },
];

const CONTENT_TYPES: { key: keyof Initial; label: string; desc: string }[] = [
  { key: "freeGamesIncludeGames", label: "Vollspiele", desc: "Kostenlos zum Behalten" },
  { key: "freeGamesIncludeDlc", label: "DLC", desc: "Erweiterungen / Add-Ons" },
  { key: "freeGamesIncludeLoot", label: "In-Game-Loot", desc: "Skins, Currency, Items" },
];

export function FreeGamesForm({ initial, channels, roles, bot }: Props) {
  const [enabled, setEnabled] = useState(initial.freeGamesEnabled);
  const [channelId, setChannelId] = useState(initial.freeGamesChannelId ?? "");
  const [sources, setSources] = useState({
    freeGamesEpic: initial.freeGamesEpic,
    freeGamesSteam: initial.freeGamesSteam,
    freeGamesGog: initial.freeGamesGog,
    freeGamesConsole: initial.freeGamesConsole,
  });
  const [content, setContent] = useState({
    freeGamesIncludeGames: initial.freeGamesIncludeGames,
    freeGamesIncludeDlc: initial.freeGamesIncludeDlc,
    freeGamesIncludeLoot: initial.freeGamesIncludeLoot,
  });
  const [message, setMessage] = useState(initial.freeGamesMessage ?? "");
  const [footer, setFooter] = useState(initial.freeGamesFooterText ?? "");
  const [pingRoleId, setPingRoleId] = useState(initial.freeGamesPingRoleId ?? "");
  const [roleOpen, setRoleOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [checkResult, setCheckResult] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isChecking, startCheck] = useTransition();

  const selectedRole = roles.find((r) => r.roleId === pingRoleId);
  const activeSources = Object.values(sources).filter(Boolean).length;
  const activeContent = Object.values(content).filter(Boolean).length;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveFreeGamesSettings(formData);
      setFeedback(
        res.ok ? { kind: "ok", msg: "Gespeichert." } : { kind: "error", msg: res.error },
      );
    });
  };

  const onCheck = () => {
    setCheckResult(null);
    startCheck(async () => {
      const res = await checkNow();
      setCheckResult(
        res.ok
          ? {
              kind: "ok",
              msg: `${res.posted} gepostet, ${res.skipped} bekannt, ${res.fetched} gefunden.`,
            }
          : { kind: "error", msg: res.error },
      );
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FeatureSubCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M14 9V5a3 3 0 0 0-6 0v4" />
            <rect x="2" y="9" width="20" height="12" rx="2" />
            <path d="M12 12v.01" />
          </svg>
        }
        title="Free-Games-Modul"
        description="Bot prüft alle 6h die Quellen und postet neue Gratis-Aktionen."
        enabled={enabled}
        toggleName="freeGamesEnabled"
        onToggleChange={setEnabled}
        tone="emerald"
      >
        {enabled && (
          <FormField label="Post-Channel">
            <ChannelPicker
              name="freeGamesChannelId"
              defaultValue={initial.freeGamesChannelId}
              value={channelId}
              channels={channels}
              allowedTypes={[0, 5]}
              placeholder="— Channel wählen —"
              onChange={setChannelId}
            />
          </FormField>
        )}
      </FeatureSubCard>

      <div className={enabled ? "" : "pointer-events-none opacity-40"}>
        {/* Quellen */}
        <div className="mb-3 mt-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Plattformen
          </span>
          <span className="text-[10px] text-ink-subtle">
            {activeSources}/4 aktiv
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <ToggleChip
              key={s.key}
              platform={s.platform}
              label={s.label}
              sub={s.sub}
              name={s.key}
              checked={sources[s.key as keyof typeof sources]}
              onChange={(v) => setSources((p) => ({ ...p, [s.key]: v }))}
            />
          ))}
        </div>

        {/* Inhalt */}
        <div className="mb-3 mt-6 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Welche Inhalte posten
          </span>
          <span className="text-[10px] text-ink-subtle">
            {activeContent}/3 aktiv
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {CONTENT_TYPES.map((c) => (
            <ToggleChip
              key={c.key}
              label={c.label}
              sub={c.desc}
              name={c.key}
              checked={content[c.key as keyof typeof content]}
              onChange={(v) => setContent((p) => ({ ...p, [c.key]: v }))}
            />
          ))}
        </div>

        {/* Begleitnachricht */}
        <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Begleitnachricht
        </div>
        <div className="rounded-2xl border border-line bg-bg-elevated/40 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
              Vorlagen
            </span>
            {MESSAGE_PRESETS.map((p) => {
              const isActive = message.trim() === p.text.trim();
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setMessage(p.text)}
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
            {message && (
              <button
                type="button"
                onClick={() => setMessage("")}
                className="rounded-md border border-line bg-bg-elevated/40 px-2 py-0.5 text-[11px] text-rose-400 hover:bg-rose-500/10"
              >
                Leeren
              </button>
            )}
          </div>

          <textarea
            name="freeGamesMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Optional — Nachricht über den Embeds. Leer = nur Embeds."
            className="input min-h-[60px] resize-y w-full"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
              Platzhalter
            </span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMessage((m) => m + p)}
                title="Einfügen"
                className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted hover:bg-bg-hover hover:text-ink"
              >
                {p}
              </button>
            ))}
            <span className="ml-2 text-[10px] text-ink-subtle">
              {"{role}"} = Rollen-Mention · {"{count}"} = Anzahl neuer Spiele
            </span>
          </div>

          <MessagePreview
            text={message.replaceAll("{role}", "<@&123>").replaceAll("{count}", "3")}
            botName={bot.name}
            botAvatarUrl={bot.avatarUrl}
            emptyText="nur Embeds, keine Begleitnachricht"
            hint='Beispieldaten: 3 neue Spiele, Rollen-Mention als Platzhalter'
          />
        </div>

        {/* Ping & Footer */}
        <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Erscheinungsbild
        </div>
        <div className="grid gap-4 rounded-2xl border border-line bg-bg-elevated/40 p-5 sm:grid-cols-2">
          <FormField label="Ping-Rolle (optional)">
            <input type="hidden" name="freeGamesPingRoleId" value={pingRoleId} />
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleOpen(!roleOpen)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-bg-elevated px-4 py-2.5 text-sm text-ink shadow-inner transition-colors hover:border-line-strong"
              >
                {selectedRole ? (
                  <span
                    className="inline-flex items-center gap-2"
                    style={{ color: intToHex(selectedRole.color) }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: intToHex(selectedRole.color) }}
                    />
                    @{selectedRole.name}
                  </span>
                ) : (
                  <span className="text-ink-subtle">— keine Rolle pingen —</span>
                )}
                <svg className="h-3.5 w-3.5 text-ink-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {roleOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-line bg-bg-elevated p-1 shadow-card-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setPingRoleId("");
                      setRoleOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-subtle hover:bg-bg-hover"
                  >
                    — keine Rolle —
                  </button>
                  {roles.map((r) => {
                    const c = intToHex(r.color);
                    return (
                      <button
                        key={r.roleId}
                        type="button"
                        onClick={() => {
                          setPingRoleId(r.roleId);
                          setRoleOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-bg-hover"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                        <span className="truncate" style={{ color: c }}>
                          @{r.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Footer-Text (optional)" hint="Erscheint unten am Embed mit dem Server-Icon.">
            <input
              name="freeGamesFooterText"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              maxLength={200}
              placeholder="z. B. Powered by Mein Server"
              className="input"
            />
          </FormField>
        </div>
      </div>

      {/* Versteckte Inputs für Sources/Content damit FormData die immer sieht */}
      <input type="hidden" name="__no_op" value="x" />
      {/* Hidden Toggle-States als 'on'/'' für Server-Action */}
      {SOURCES.map((s) => (
        <input
          key={s.key}
          type="hidden"
          name={s.key}
          value={sources[s.key as keyof typeof sources] ? "on" : ""}
        />
      ))}
      {CONTENT_TYPES.map((c) => (
        <input
          key={c.key}
          type="hidden"
          name={c.key}
          value={content[c.key as keyof typeof content] ? "on" : ""}
        />
      ))}
      {!enabled && (
        <>
          <input type="hidden" name="freeGamesChannelId" value={channelId} />
          <input type="hidden" name="freeGamesMessage" value={message} />
          <input type="hidden" name="freeGamesFooterText" value={footer} />
        </>
      )}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-bg-card/95 px-5 py-3 shadow-card-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {initial.freeGamesLastCheck && (
            <span className="text-ink-subtle">
              Letzter Check: {initial.freeGamesLastCheck.toLocaleString("de-DE")}
            </span>
          )}
          {feedback && (
            <span
              className={feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"}
            >
              {feedback.msg}
            </span>
          )}
          {checkResult && (
            <span
              className={checkResult.kind === "ok" ? "text-emerald-400" : "text-rose-400"}
            >
              {checkResult.msg}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCheck}
            disabled={isChecking || !enabled || !channelId}
            className="btn-secondary disabled:opacity-40"
            title={
              !enabled
                ? "Feature deaktiviert"
                : !channelId
                  ? "Erst Channel auswählen + speichern"
                  : "Jetzt eine Prüfung anstoßen"
            }
          >
            {isChecking ? "Prüfe…" : "Jetzt prüfen"}
          </button>
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

function ToggleChip({
  platform,
  label,
  sub,
  name,
  checked,
  onChange,
}: {
  platform?: string;
  label: string;
  sub?: string;
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
        checked
          ? "border-brand/40 bg-brand/[0.06]"
          : "border-line bg-bg-elevated/40 hover:border-line-strong"
      }`}
    >
      {platform && (
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            checked ? "bg-brand/15 text-ink" : "bg-bg-elevated text-ink-muted"
          }`}
        >
          <PlatformLogo platform={platform} className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">{label}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-ink-subtle">{sub}</div>}
      </div>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-gradient" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </label>
  );
}

interface SubCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  toggleName: string;
  onToggleChange: (v: boolean) => void;
  tone: "emerald";
  children?: ReactNode;
}

function FeatureSubCard({
  icon,
  title,
  description,
  enabled,
  toggleName,
  onToggleChange,
  children,
}: SubCardProps) {
  const toneClass = enabled
    ? "border-emerald-500/30 bg-emerald-500/[0.04]"
    : "border-line bg-bg-elevated/40";
  const iconClass = enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/10 text-zinc-500";
  return (
    <div className={`rounded-2xl border p-5 transition-colors ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconClass}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">{title}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{description}</div>
          </div>
        </div>
        <input
          type="checkbox"
          name={toggleName}
          checked={enabled}
          onChange={(e) => onToggleChange(e.target.checked)}
          className="sr-only"
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
        <div className="mt-4 border-t border-line/60 pt-4">{children}</div>
      )}
    </div>
  );
}
