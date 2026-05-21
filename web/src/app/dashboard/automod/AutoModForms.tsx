"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/Toggle";
import { Modal } from "@/components/Modal";
import { addWord, removeWord, saveAutoModSettings } from "./actions";
import { WhitelistEditor, type InviteRow } from "./WhitelistEditor";
import { ExclusionEditor, type ExcludedChannelRow } from "./ExclusionEditor";
import { BypassRoleEditor, type BypassRoleOption } from "./BypassRoleEditor";
import type { ChannelOption } from "@/components/ChannelPicker";

type ModalKey = "bypass" | "invites" | "mentions" | "spam" | "exclusions";

function AdjustButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg-elevated/60 px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand/40 hover:bg-bg-hover hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
      Anpassen
    </button>
  );
}

function ToggleRow({
  enabled,
  onAdjust,
  children,
}: {
  enabled: boolean;
  onAdjust?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
      {children}
      {onAdjust && enabled && (
        <div className="flex justify-end pb-3">
          <AdjustButton onClick={onAdjust} />
        </div>
      )}
    </div>
  );
}

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

interface SettingsProps {
  initial: Initial;
  inviteWhitelist: InviteRow[];
  excludedChannels: ExcludedChannelRow[];
  allChannels: ChannelOption[];
  bypassRoles: BypassRoleOption[];
  availableRoles: BypassRoleOption[];
}

function SubMenu({
  open,
  allowOverflow = false,
  children,
}: {
  open: boolean;
  allowOverflow?: boolean;
  children: React.ReactNode;
}) {
  const [overflowVisible, setOverflowVisible] = useState(open && allowOverflow);
  useEffect(() => {
    if (!allowOverflow) {
      setOverflowVisible(false);
      return;
    }
    if (open) {
      const t = setTimeout(() => setOverflowVisible(true), 220);
      return () => clearTimeout(t);
    }
    setOverflowVisible(false);
  }, [open, allowOverflow]);

  return (
    <div
      className={`grid transition-all duration-200 ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      } ${overflowVisible ? "overflow-visible" : "overflow-hidden"}`}
    >
      <div className="min-h-0">
        <div className="ml-3 mt-2 border-l-2 border-brand/30 pl-4">{children}</div>
      </div>
    </div>
  );
}

export function SettingsForm({
  initial,
  inviteWhitelist,
  excludedChannels,
  allChannels,
  bypassRoles,
  availableRoles,
}: SettingsProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Toggle-States
  const [autoModOn, setAutoModOn] = useState(initial.autoModEnabled);
  const [massMentionOn, setMassMentionOn] = useState(initial.autoModMassMentionEnabled);
  const [inviteBlockOn, setInviteBlockOn] = useState(initial.autoModBlockInvites);
  const [spamOn, setSpamOn] = useState(initial.autoModSpamEnabled);
  const [exclusionsOn, setExclusionsOn] = useState(initial.autoModExcludedChannelsEnabled);
  const [bypassOn, setBypassOn] = useState(initial.autoModBypassMods);

  // Zahlen-Werte als kontrollierte States — werden via hidden inputs submitted,
  // damit Modal sie nicht beim Schließen verliert.
  const [massMentionLimit, setMassMentionLimit] = useState(initial.autoModMassMentionLimit);
  const [spamMessages, setSpamMessages] = useState(initial.autoModSpamMessages);
  const [spamSeconds, setSpamSeconds] = useState(initial.autoModSpamSeconds);
  const [spamTimeout, setSpamTimeout] = useState(initial.autoModSpamTimeoutMinutes);

  const [modal, setModal] = useState<ModalKey | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveAutoModSettings(formData);
      setFeedback(res.ok ? "Gespeichert." : res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Master-Schalter */}
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="autoModEnabled"
          label="AutoMod aktiv"
          description="Hauptschalter — wenn aus, läuft kein Filter."
          defaultChecked={initial.autoModEnabled}
          onCheckedChange={setAutoModOn}
        />
      </div>

      <SubMenu open={autoModOn}>
        <div className="space-y-3">
          <ToggleRow enabled={false}>
            <Toggle
              name="autoModDM"
              label="User per DM informieren"
              description="Bot schickt dem User eine DM, wenn seine Nachricht gelöscht wurde."
              defaultChecked={initial.autoModDM}
            />
          </ToggleRow>

          <ToggleRow enabled={bypassOn} onAdjust={() => setModal("bypass")}>
            <Toggle
              name="autoModBypassMods"
              label="Bestimmte Rollen ausnehmen"
              description="Nachrichten von Usern mit diesen Rollen werden nicht gefiltert."
              defaultChecked={initial.autoModBypassMods}
              onCheckedChange={setBypassOn}
            />
          </ToggleRow>

          <ToggleRow enabled={inviteBlockOn} onAdjust={() => setModal("invites")}>
            <Toggle
              name="autoModBlockInvites"
              label="Discord-Invite-Links blocken"
              description="Alle Discord-Invites werden gelöscht außer denen auf der Whitelist."
              defaultChecked={initial.autoModBlockInvites}
              onCheckedChange={setInviteBlockOn}
            />
          </ToggleRow>

          <ToggleRow enabled={massMentionOn} onAdjust={() => setModal("mentions")}>
            <Toggle
              name="autoModMassMentionEnabled"
              label="Mass-Mention-Limit"
              description="Nachrichten mit zu vielen Erwähnungen werden gelöscht."
              defaultChecked={initial.autoModMassMentionEnabled}
              onCheckedChange={setMassMentionOn}
            />
          </ToggleRow>

          <ToggleRow enabled={spamOn} onAdjust={() => setModal("spam")}>
            <Toggle
              name="autoModSpamEnabled"
              label="Anti-Spam"
              description="Bei zu vielen Nachrichten in kurzer Zeit: Auto-Timeout."
              defaultChecked={initial.autoModSpamEnabled}
              onCheckedChange={setSpamOn}
            />
          </ToggleRow>

          <ToggleRow enabled={exclusionsOn} onAdjust={() => setModal("exclusions")}>
            <Toggle
              name="autoModExcludedChannelsEnabled"
              label="Channel-Ausnahmen aktiv"
              description="In den unten gelisteten Channels läuft kein AutoMod."
              defaultChecked={initial.autoModExcludedChannelsEnabled}
              onCheckedChange={setExclusionsOn}
            />
          </ToggleRow>
        </div>
      </SubMenu>

      {/* Hidden inputs für Zahlen-Werte — Modal darf schließen, Wert bleibt. */}
      <input type="hidden" name="autoModMassMentionLimit" value={massMentionLimit} />
      <input type="hidden" name="autoModSpamMessages" value={spamMessages} />
      <input type="hidden" name="autoModSpamSeconds" value={spamSeconds} />
      <input type="hidden" name="autoModSpamTimeoutMinutes" value={spamTimeout} />

      {/* Modals */}
      <Modal
        open={modal === "bypass"}
        onClose={() => setModal(null)}
        title="Rollen-Ausnahmen"
        width="md"
      >
        <p className="mb-4 text-sm text-ink-muted">
          User mit einer dieser Rollen werden vom AutoMod-Filter komplett übergangen.
        </p>
        <BypassRoleEditor current={bypassRoles} available={availableRoles} />
      </Modal>

      <Modal
        open={modal === "invites"}
        onClose={() => setModal(null)}
        title="Invite-Whitelist"
        width="lg"
      >
        <p className="mb-4 text-sm text-ink-muted">
          Invites zu Servern auf dieser Liste bleiben stehen. Dein eigener Server ist immer
          erlaubt — du musst ihn nicht extra hinzufügen.
        </p>
        <WhitelistEditor invites={inviteWhitelist} />
      </Modal>

      <Modal
        open={modal === "mentions"}
        onClose={() => setModal(null)}
        title="Mass-Mention-Limit"
        width="sm"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Maximale Mentions pro Nachricht
          </span>
          <input
            type="number"
            min={1}
            max={50}
            value={massMentionLimit}
            onChange={(e) => setMassMentionLimit(Number(e.target.value) || 0)}
            className="input max-w-[150px]"
          />
        </label>
        <p className="mt-2 text-xs text-ink-subtle">
          Zählt User- und Rollen-Mentions zusammen.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setModal(null)}
            className="btn-primary"
          >
            Fertig
          </button>
        </div>
      </Modal>

      <Modal
        open={modal === "spam"}
        onClose={() => setModal(null)}
        title="Anti-Spam-Einstellungen"
        width="md"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Nachrichten</span>
            <input
              type="number"
              min={2}
              max={50}
              value={spamMessages}
              onChange={(e) => setSpamMessages(Number(e.target.value) || 0)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">in Sekunden</span>
            <input
              type="number"
              min={1}
              max={120}
              value={spamSeconds}
              onChange={(e) => setSpamSeconds(Number(e.target.value) || 0)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Timeout (Min)</span>
            <input
              type="number"
              min={1}
              max={1440}
              value={spamTimeout}
              onChange={(e) => setSpamTimeout(Number(e.target.value) || 0)}
              className="input"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-ink-subtle">
          Default: 5 Nachrichten in 5 Sekunden → 5 Minuten Timeout.
        </p>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => setModal(null)} className="btn-primary">
            Fertig
          </button>
        </div>
      </Modal>

      <Modal
        open={modal === "exclusions"}
        onClose={() => setModal(null)}
        title="Channel-Ausnahmen"
        width="lg"
      >
        <p className="mb-4 text-sm text-ink-muted">
          In diesen Channels läuft kein AutoMod — Nachrichten werden nicht gefiltert.
        </p>
        <ExclusionEditor channels={excludedChannels} allChannels={allChannels} />
      </Modal>

      {/* Versteckte Toggle-Werte für ausgeblendete Sub-Toggles — sonst gehen Werte beim Save verloren.
          (Zahlen-Werte sind oben bereits global als hidden inputs gerendert.) */}
      {!autoModOn && (
        <>
          <input type="hidden" name="autoModDM" value={initial.autoModDM ? "on" : ""} />
          <input
            type="hidden"
            name="autoModBypassMods"
            value={initial.autoModBypassMods ? "on" : ""}
          />
          <input
            type="hidden"
            name="autoModBlockInvites"
            value={initial.autoModBlockInvites ? "on" : ""}
          />
          <input
            type="hidden"
            name="autoModMassMentionEnabled"
            value={initial.autoModMassMentionEnabled ? "on" : ""}
          />
          <input
            type="hidden"
            name="autoModSpamEnabled"
            value={initial.autoModSpamEnabled ? "on" : ""}
          />
          <input
            type="hidden"
            name="autoModExcludedChannelsEnabled"
            value={initial.autoModExcludedChannelsEnabled ? "on" : ""}
          />
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
          {isPending ? "Speichere…" : "Speichern"}
        </button>
        {feedback && <span className="text-sm text-emerald-400">{feedback}</span>}
      </div>
    </form>
  );
}

export function AddWordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await addWord(formData);
      if (res.ok) {
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          name="word"
          type="text"
          required
          maxLength={100}
          placeholder="Wort eingeben…"
          className="input flex-1"
        />
        <button type="submit" disabled={isPending} className="btn-primary shrink-0 disabled:opacity-60">
          {isPending ? "…" : "+ Hinzufügen"}
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}
      <p className="text-xs text-ink-subtle">
        Case-insensitive Substring-Match. „idiot" trifft auch „IDIOTEN!" und „du Idiot!".
      </p>
    </form>
  );
}

export function WordList({ words }: { words: WordRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const onRemove = (id: number) => {
    setPendingId(id);
    startTransition(async () => {
      await removeWord(id);
      router.refresh();
      setPendingId(null);
    });
  };

  if (words.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
        Noch keine Wörter auf der Liste.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {words.map((w) => (
        <span
          key={w.id}
          className={`inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated/60 py-1 pl-3 pr-1 text-sm transition-opacity ${pendingId === w.id ? "opacity-40" : ""}`}
        >
          <span className="font-mono">{w.word}</span>
          <button
            type="button"
            onClick={() => onRemove(w.id)}
            disabled={isPending}
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
  );
}
