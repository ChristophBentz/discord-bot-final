"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/Toggle";
import { Modal } from "@/components/Modal";
import { addWord, removeWord, saveAutoModSettings } from "./actions";
import { WhitelistEditor, type InviteRow } from "./WhitelistEditor";
import { ExclusionEditor, type ExcludedChannelRow } from "./ExclusionEditor";
import { BypassRoleEditor, type BypassRoleOption } from "./BypassRoleEditor";
import type { ChannelOption } from "@/components/ChannelPicker";

export interface WordRow {
  id: number;
  word: string;
  createdAt: string;
}

interface Initial {
  autoModEnabled: boolean;
  autoModDM: boolean;
  autoModBypassMods: boolean;
  autoModBlockInvites: boolean;
  autoModMassMentionEnabled: boolean;
  autoModMassMentionLimit: number;
  autoModSpamEnabled: boolean;
  autoModSpamMessages: number;
  autoModSpamSeconds: number;
  autoModSpamTimeoutMinutes: number;
  autoModExcludedChannelsEnabled: boolean;
}

interface Props {
  initial: Initial;
  words: WordRow[];
  inviteWhitelist: InviteRow[];
  excludedChannels: ExcludedChannelRow[];
  allChannels: ChannelOption[];
  bypassRoles: BypassRoleOption[];
  availableRoles: BypassRoleOption[];
}

type ModalKey = "bypass" | "invites" | "exclusions" | "words";

export function AutoModManager({
  initial,
  words,
  inviteWhitelist,
  excludedChannels,
  allChannels,
  bypassRoles,
  availableRoles,
}: Props) {
  const [autoModOn, setAutoModOn] = useState(initial.autoModEnabled);
  const [dmOn, setDmOn] = useState(initial.autoModDM);
  const [bypassOn, setBypassOn] = useState(initial.autoModBypassMods);
  const [inviteOn, setInviteOn] = useState(initial.autoModBlockInvites);
  const [mentionOn, setMentionOn] = useState(initial.autoModMassMentionEnabled);
  const [spamOn, setSpamOn] = useState(initial.autoModSpamEnabled);
  const [exclusionsOn, setExclusionsOn] = useState(initial.autoModExcludedChannelsEnabled);
  const [wordsOn, setWordsOn] = useState(words.length > 0); // konzeptuell: wenn Wörter da, ist Filter "an"

  const [mentionLimit, setMentionLimit] = useState(initial.autoModMassMentionLimit);
  const [spamMsg, setSpamMsg] = useState(initial.autoModSpamMessages);
  const [spamSec, setSpamSec] = useState(initial.autoModSpamSeconds);
  const [spamTimeout, setSpamTimeout] = useState(initial.autoModSpamTimeoutMinutes);

  const [modal, setModal] = useState<ModalKey | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeRules = [
    words.length > 0,
    inviteOn,
    mentionOn,
    spamOn,
  ].filter(Boolean).length;
  const totalRules = 4;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await saveAutoModSettings(fd);
      setFeedback(r.ok ? { kind: "ok", msg: "Gespeichert." } : { kind: "error", msg: r.error });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Hero — Master-Toggle + Status */}
      <div
        className={`overflow-hidden rounded-2xl border ${
          autoModOn
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-bg-card"
            : "border-line bg-bg-elevated/40"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                autoModOn
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-zinc-500/15 text-zinc-400"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-ink">AutoMod</div>
              <div className="text-xs text-ink-muted">
                {autoModOn ? (
                  <>
                    <span className="text-emerald-400">{activeRules}</span> von {totalRules} Filter-Regeln aktiv
                  </>
                ) : (
                  "Alle Filter pausiert"
                )}
              </div>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <span className="text-xs font-medium text-ink-muted">
              {autoModOn ? "Aktiv" : "Aus"}
            </span>
            <input
              type="checkbox"
              name="autoModEnabled"
              checked={autoModOn}
              onChange={(e) => setAutoModOn(e.target.checked)}
              className="peer sr-only"
            />
            <span
              className="relative h-6 w-11 rounded-full bg-zinc-700 transition-colors peer-checked:bg-emerald-500"
              onClick={() => setAutoModOn(!autoModOn)}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  autoModOn ? "translate-x-5" : ""
                }`}
              />
            </span>
          </label>
        </div>
      </div>

      <div className={autoModOn ? "" : "pointer-events-none opacity-40"}>
        {/* Filter-Regeln als Karten-Grid */}
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Filter-Regeln
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <RuleCard
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 14.14 14.14" />
              </svg>
            }
            title="Wortfilter"
            description="Nachrichten mit verbotenen Wörtern werden gelöscht."
            enabled={words.length > 0}
            stat={`${words.length} ${words.length === 1 ? "Wort" : "Wörter"}`}
            tone="rose"
            onManage={() => setModal("words")}
          />

          <RuleCard
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            }
            title="Invite-Filter"
            description="Discord-Einladungslinks zu fremden Servern blocken."
            enabled={inviteOn}
            toggleName="autoModBlockInvites"
            onToggleChange={setInviteOn}
            stat={inviteOn ? `${inviteWhitelist.length} erlaubt` : undefined}
            tone="amber"
            onManage={() => setModal("invites")}
            manageLabel="Whitelist"
          />

          <RuleCard
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0z" />
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              </svg>
            }
            title="Mass-Mention"
            description="Nachrichten mit zu vielen Erwähnungen löschen."
            enabled={mentionOn}
            toggleName="autoModMassMentionEnabled"
            onToggleChange={setMentionOn}
            tone="purple"
          >
            {mentionOn && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ink-muted">Limit:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={mentionLimit}
                  onChange={(e) => setMentionLimit(Number(e.target.value) || 0)}
                  className="input h-8 w-20 px-2 py-1 text-sm"
                />
                <span className="text-xs text-ink-subtle">Mentions/Nachricht</span>
              </div>
            )}
          </RuleCard>

          <RuleCard
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            }
            title="Anti-Spam"
            description="Bei zu vielen Nachrichten in kurzer Zeit: Timeout."
            enabled={spamOn}
            toggleName="autoModSpamEnabled"
            onToggleChange={setSpamOn}
            tone="rose"
          >
            {spamOn && (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={spamMsg}
                    onChange={(e) => setSpamMsg(Number(e.target.value) || 0)}
                    className="input h-8 w-16 px-2 py-1 text-sm"
                  />
                  <span className="text-ink-muted">Nachrichten in</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={spamSec}
                    onChange={(e) => setSpamSec(Number(e.target.value) || 0)}
                    className="input h-8 w-16 px-2 py-1 text-sm"
                  />
                  <span className="text-ink-muted">Sek.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted">→ Timeout:</span>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={spamTimeout}
                    onChange={(e) => setSpamTimeout(Number(e.target.value) || 0)}
                    className="input h-8 w-16 px-2 py-1 text-sm"
                  />
                  <span className="text-ink-muted">Min</span>
                </div>
              </div>
            )}
          </RuleCard>
        </div>

        {/* Globale Optionen */}
        <div className="mt-6">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Globale Optionen
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-bg-elevated/40">
            <div className="divide-y divide-line">
              <OptionRow
                title="User per DM informieren"
                description="Discord-Direct-Message wenn eine Nachricht gelöscht wurde."
                toggleName="autoModDM"
                checked={dmOn}
                onChange={setDmOn}
              />
              <OptionRow
                title="Rollen ausnehmen"
                description="User mit diesen Rollen werden vom Filter übergangen."
                toggleName="autoModBypassMods"
                checked={bypassOn}
                onChange={setBypassOn}
                stat={bypassOn ? `${bypassRoles.length} Rollen` : undefined}
                onManage={bypassOn ? () => setModal("bypass") : undefined}
              />
              <OptionRow
                title="Channel-Ausnahmen"
                description="In diesen Channels läuft kein AutoMod."
                toggleName="autoModExcludedChannelsEnabled"
                checked={exclusionsOn}
                onChange={setExclusionsOn}
                stat={exclusionsOn ? `${excludedChannels.length} Channels` : undefined}
                onManage={exclusionsOn ? () => setModal("exclusions") : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden inputs für State-Werte die nicht in einem Toggle sind */}
      <input type="hidden" name="autoModMassMentionLimit" value={mentionLimit} />
      <input type="hidden" name="autoModSpamMessages" value={spamMsg} />
      <input type="hidden" name="autoModSpamSeconds" value={spamSec} />
      <input type="hidden" name="autoModSpamTimeoutMinutes" value={spamTimeout} />
      {!autoModOn && (
        <>
          <input type="hidden" name="autoModDM" value={dmOn ? "on" : ""} />
          <input type="hidden" name="autoModBypassMods" value={bypassOn ? "on" : ""} />
          <input type="hidden" name="autoModBlockInvites" value={inviteOn ? "on" : ""} />
          <input
            type="hidden"
            name="autoModMassMentionEnabled"
            value={mentionOn ? "on" : ""}
          />
          <input type="hidden" name="autoModSpamEnabled" value={spamOn ? "on" : ""} />
          <input
            type="hidden"
            name="autoModExcludedChannelsEnabled"
            value={exclusionsOn ? "on" : ""}
          />
        </>
      )}

      {/* Save bar */}
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

      {/* Modals */}
      <Modal open={modal === "words"} onClose={() => setModal(null)} title="Wortfilter" width="lg">
        <WordsManager words={words} />
      </Modal>

      <Modal open={modal === "bypass"} onClose={() => setModal(null)} title="Bypass-Rollen" width="md">
        <p className="mb-4 text-sm text-ink-muted">
          User mit einer dieser Rollen werden vom AutoMod-Filter komplett übergangen.
        </p>
        <BypassRoleEditor current={bypassRoles} available={availableRoles} />
      </Modal>

      <Modal open={modal === "invites"} onClose={() => setModal(null)} title="Invite-Whitelist" width="lg">
        <p className="mb-4 text-sm text-ink-muted">
          Invites zu Servern auf dieser Liste bleiben stehen. Dein eigener Server ist immer
          erlaubt — du musst ihn nicht extra hinzufügen.
        </p>
        <WhitelistEditor invites={inviteWhitelist} />
      </Modal>

      <Modal open={modal === "exclusions"} onClose={() => setModal(null)} title="Channel-Ausnahmen" width="lg">
        <p className="mb-4 text-sm text-ink-muted">
          In diesen Channels läuft kein AutoMod — Nachrichten werden nicht gefiltert.
        </p>
        <ExclusionEditor channels={excludedChannels} allChannels={allChannels} />
      </Modal>
    </form>
  );
}

// ─── Rule Card ─────────────────────────────────────────────────────────────
interface RuleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  toggleName?: string;
  onToggleChange?: (v: boolean) => void;
  stat?: string;
  tone: "rose" | "amber" | "purple";
  onManage?: () => void;
  manageLabel?: string;
  children?: ReactNode;
}

function RuleCard({
  icon,
  title,
  description,
  enabled,
  toggleName,
  onToggleChange,
  stat,
  tone,
  onManage,
  manageLabel = "Verwalten",
  children,
}: RuleCardProps) {
  const toneClass = enabled
    ? tone === "rose"
      ? "border-rose-500/30 bg-rose-500/[0.04]"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/[0.04]"
        : "border-purple-500/30 bg-purple-500/[0.04]"
    : "border-line bg-bg-elevated/40";
  const iconClass = enabled
    ? tone === "rose"
      ? "bg-rose-500/15 text-rose-400"
      : tone === "amber"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-purple-500/15 text-purple-400"
    : "bg-zinc-500/10 text-zinc-500";

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${toneClass}`}>
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
        {toggleName && (
          <input
            type="checkbox"
            name={toggleName}
            checked={enabled}
            onChange={(e) => onToggleChange?.(e.target.checked)}
            className="peer/r sr-only"
          />
        )}
        {toggleName ? (
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
        ) : enabled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Aktiv
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
            Leer
          </span>
        )}
      </div>

      {children}

      {(stat || onManage) && (
        <div className="mt-3 flex items-center justify-between">
          {stat ? <span className="text-xs text-ink-muted">{stat}</span> : <span />}
          {onManage && (
            <button
              type="button"
              onClick={onManage}
              className="text-xs font-medium text-brand hover:text-brand-light"
            >
              {manageLabel} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Option Row ─────────────────────────────────────────────────────────────
function OptionRow({
  title,
  description,
  toggleName,
  checked,
  onChange,
  stat,
  onManage,
}: {
  title: string;
  description: string;
  toggleName: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  stat?: string;
  onManage?: () => void;
}) {
  return (
    <div className="px-5">
      <Toggle
        name={toggleName}
        label={title}
        description={description}
        defaultChecked={checked}
        onCheckedChange={onChange}
      />
      {checked && onManage && (
        <div className="flex items-center justify-end gap-3 pb-3">
          {stat && <span className="text-xs text-ink-muted">{stat}</span>}
          <button
            type="button"
            onClick={onManage}
            className="rounded-md border border-line bg-bg-elevated/60 px-2.5 py-1 text-xs font-medium text-ink-muted hover:border-line-strong hover:text-ink"
          >
            Verwalten
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Wörter-Manager im Modal ────────────────────────────────────────────────
function WordsManager({ words }: { words: WordRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAdd] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isRemoving, startRemove] = useTransition();
  const [value, setValue] = useState("");

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("word", value);
    startAdd(async () => {
      const r = await addWord(fd);
      if (r.ok) {
        setValue("");
        router.refresh();
      } else setError(r.error);
    });
  };

  const onRemove = (id: number) => {
    setPendingId(id);
    startRemove(async () => {
      await removeWord(id);
      router.refresh();
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          maxLength={100}
          placeholder="Wort hinzufügen…"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={isAdding || !value.trim()}
          className="btn-primary shrink-0 disabled:opacity-60"
        >
          {isAdding ? "…" : "Hinzufügen"}
        </button>
      </form>
      <p className="text-xs text-ink-subtle">
        Case-insensitive Substring-Match. „idiot" trifft auch „IDIOTEN!" und „du Idiot!".
      </p>
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          {words.length} {words.length === 1 ? "Wort" : "Wörter"} auf der Liste
        </div>
        {words.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
            Noch keine Wörter konfiguriert.
          </div>
        ) : (
          <div className="flex max-h-[40vh] flex-wrap gap-2 overflow-y-auto">
            {words.map((w) => (
              <span
                key={w.id}
                className={`inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated/60 py-1 pl-3 pr-1 text-sm transition-opacity ${
                  pendingId === w.id ? "opacity-40" : ""
                }`}
              >
                <span className="font-mono">{w.word}</span>
                <button
                  type="button"
                  onClick={() => onRemove(w.id)}
                  disabled={isRemoving}
                  title="Entfernen"
                  className="grid h-5 w-5 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
