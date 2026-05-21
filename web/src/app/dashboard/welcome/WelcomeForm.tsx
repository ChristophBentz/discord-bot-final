"use client";

import { useEffect, useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
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
  // Wenn `allowOverflow`: nach Abschluss der Slide-Animation overflow freigeben,
  // damit z.B. Dropdowns aus dem SubMenu rauskommen können.
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

const PLACEHOLDER_HINT = (
  <p className="mt-1.5 text-xs text-ink-subtle">
    Platzhalter:{" "}
    <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
      {"{user}"}
    </code>{" "}
    <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
      {"{username}"}
    </code>{" "}
    <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
      {"{server}"}
    </code>{" "}
    <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
      {"{memberCount}"}
    </code>
  </p>
);

const WELCOME_PRESETS: Array<{ label: string; text: string }> = [
  {
    label: "Klassisch",
    text: "Willkommen {user} auf {server}! 🎉 Schön dich hier zu haben.",
  },
  {
    label: "Mit Counter",
    text: "Hey {user}, willkommen auf {server}! Du bist Member Nr. {memberCount}.",
  },
  {
    label: "Freundlich",
    text: "Hallo {username}! 👋 Viel Spaß auf {server} — schau gerne in #rules vorbei.",
  },
  {
    label: "Cinematisch",
    text: "Eine neue Hoffnung erscheint. {user} ist {server} beigetreten.",
  },
  { label: "Knapp", text: "Willkommen, {user}!" },
];

const LEAVE_PRESETS: Array<{ label: string; text: string }> = [
  { label: "Knapp", text: "{username} hat den Server verlassen." },
  {
    label: "Freundlich",
    text: "Auf Wiedersehen, {username}. Komm bald wieder! 👋",
  },
  {
    label: "Mit Counter",
    text: "{username} ist gegangen — wir sind noch {memberCount} Member.",
  },
  {
    label: "Cinematisch",
    text: "Eine Tür schließt sich: {username} hat {server} verlassen.",
  },
];

function PresetPicker({
  presets,
  active,
  onPick,
}: {
  presets: Array<{ label: string; text: string }>;
  active: string;
  onPick: (text: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
        Vorlagen:
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

export function WelcomeForm({ initial, currentAutoRoles, availableRoles, channels }: Props) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [welcomeOn, setWelcomeOn] = useState(initial.welcomeEnabled);
  const [leaveOn, setLeaveOn] = useState(initial.leaveEnabled);
  const [autoRolesOn, setAutoRolesOn] = useState(initial.autoRolesEnabled);

  const [welcomeMsg, setWelcomeMsg] = useState(initial.welcomeMessage ?? "");
  const [leaveMsg, setLeaveMsg] = useState(initial.leaveMessage ?? "");

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveWelcomeSettings(formData);
      setFeedback(res.ok ? { kind: "ok", msg: "Gespeichert." } : { kind: "error", msg: res.error });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="welcomeEnabled"
          label="Welcome-Nachricht"
          description="Bot postet einen Embed wenn jemand dem Server beitritt."
          defaultChecked={initial.welcomeEnabled}
          onCheckedChange={setWelcomeOn}
        />
        <SubMenu open={welcomeOn}>
          <div className="space-y-3 pb-4">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Channel</span>
              <ChannelPicker
                name="welcomeChannelId"
                defaultValue={initial.welcomeChannelId}
                channels={channels}
                allowedTypes={[0, 5]}
                placeholder="— Welcome-Channel wählen —"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Nachricht</span>
              <PresetPicker
                presets={WELCOME_PRESETS}
                active={welcomeMsg}
                onPick={setWelcomeMsg}
              />
              <textarea
                name="welcomeMessage"
                rows={4}
                maxLength={1500}
                value={welcomeMsg}
                onChange={(e) => setWelcomeMsg(e.target.value)}
                placeholder="Willkommen {user} auf {server}! Du bist Member #{memberCount}."
                className="input resize-none"
              />
              {PLACEHOLDER_HINT}
            </div>
          </div>
        </SubMenu>
      </div>

      {/* Leave */}
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="leaveEnabled"
          label="Leave-Nachricht"
          description="Bot postet einen Embed wenn jemand den Server verlässt."
          defaultChecked={initial.leaveEnabled}
          onCheckedChange={setLeaveOn}
        />
        <SubMenu open={leaveOn}>
          <div className="space-y-3 pb-4">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Channel</span>
              <ChannelPicker
                name="leaveChannelId"
                defaultValue={initial.leaveChannelId}
                channels={channels}
                allowedTypes={[0, 5]}
                placeholder="— Leave-Channel wählen —"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Nachricht</span>
              <PresetPicker
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
                className="input resize-none"
              />
              {PLACEHOLDER_HINT}
            </div>
          </div>
        </SubMenu>
      </div>

      {/* Auto-Rollen */}
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="autoRolesEnabled"
          label="Auto-Rollen"
          description="Jeder neue Member bekommt diese Rollen automatisch."
          defaultChecked={initial.autoRolesEnabled}
          onCheckedChange={setAutoRolesOn}
        />
        <SubMenu open={autoRolesOn} allowOverflow>
          <div className="pb-4">
            <AutoRoleEditor current={currentAutoRoles} available={availableRoles} />
            <p className="mt-3 text-xs text-ink-subtle">
              Wichtig: Die Bot-Rolle muss höher sein als die Auto-Rollen — sonst kann Discord sie nicht vergeben.
            </p>
          </div>
        </SubMenu>
      </div>

      <div className="flex items-center gap-3 pt-2">
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
