"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { saveLoggingSettings } from "./actions";

interface Initial {
  logChannelId: string | null;
  logMessageDelete: boolean;
  logMessageEdit: boolean;
  logMemberJoin: boolean;
  logMemberLeave: boolean;
  logMemberBan: boolean;
  logMemberUnban: boolean;
  logMemberNickname: boolean;
  logMemberRoles: boolean;
  logVoice: boolean;
  logModeration: boolean;
}

const CATEGORIES: Array<{ key: keyof Initial; label: string; description: string }> = [
  { key: "logMessageDelete", label: "Nachricht gelöscht", description: "Loggt gelöschte Nachrichten (außer von Bots)." },
  { key: "logMessageEdit", label: "Nachricht bearbeitet", description: "Mit Vorher-/Nachher-Inhalt." },
  { key: "logMemberJoin", label: "Member beigetreten", description: "Inklusive Account-Alter." },
  { key: "logMemberLeave", label: "Member verlassen", description: "Mit Rollen und Beitrittsdatum." },
  { key: "logMemberBan", label: "Ban gesetzt", description: "Mit Grund (falls angegeben)." },
  { key: "logMemberUnban", label: "Ban aufgehoben", description: "Wenn jemand entbannt wird." },
  { key: "logMemberNickname", label: "Nickname geändert", description: "Vorher- und Nachher-Name." },
  { key: "logMemberRoles", label: "Rollen geändert", description: "Welche Rollen hinzukommen oder weggehen." },
  { key: "logVoice", label: "Voice-Channel", description: "Beitreten, Verlassen und Wechseln zwischen Voice-Channeln." },
  { key: "logModeration", label: "Moderation (Kick, Timeout, Warn)", description: "Wenn ein Mod einen User kickt, timeoutet oder verwarnt. Mit Moderator + Grund." },
];

export function LoggingForm({
  initial,
  channels,
}: {
  initial: Initial;
  channels: ChannelOption[];
}) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveLoggingSettings(formData);
      if (result.ok) {
        setFeedback({ kind: "ok", msg: "Gespeichert. Bot übernimmt die Änderung in wenigen Sekunden." });
      } else {
        setFeedback({ kind: "error", msg: result.error });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Log-Channel</label>
        <ChannelPicker
          name="logChannelId"
          defaultValue={initial.logChannelId}
          channels={channels}
          allowedTypes={[0, 5]}
          placeholder="Keinen — Logging aus"
        />
        <p className="mt-1.5 text-xs text-ink-subtle">
          In welchen Text-Channel der Bot Audit-Events postet.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <div className="divide-y divide-line">
          {CATEGORIES.map((cat) => (
            <Toggle
              key={cat.key}
              name={cat.key}
              label={cat.label}
              description={cat.description}
              defaultChecked={Boolean(initial[cat.key])}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
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
