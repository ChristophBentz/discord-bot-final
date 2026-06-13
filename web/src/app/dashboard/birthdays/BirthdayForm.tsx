"use client";

import { useState, useTransition } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { MessagePreview } from "@/components/MessagePreview";
import { saveBirthdaySettings } from "./actions";

interface Initial {
  birthdayEnabled: boolean;
  birthdayChannelId: string | null;
  birthdayPingRoleId: string | null;
  birthdayMessage: string | null;
}

interface RoleOption {
  roleId: string;
  name: string;
  color: number;
}

const DEFAULT_MESSAGE = "🎉 Alles Gute zum Geburtstag, {user}!{age}";

export function BirthdayForm({
  initial,
  channels,
  roles,
  bot,
}: {
  initial: Initial;
  channels: ChannelOption[];
  roles: RoleOption[];
  bot: { name: string; avatarUrl: string | null };
}) {
  const [enabled, setEnabled] = useState(initial.birthdayEnabled);
  const [channelId, setChannelId] = useState(initial.birthdayChannelId ?? "");
  const [pingRoleId, setPingRoleId] = useState(initial.birthdayPingRoleId ?? "");
  const [message, setMessage] = useState(initial.birthdayMessage ?? "");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveBirthdaySettings(formData);
      setFeedback(res.ok ? { kind: "ok", msg: "Gespeichert." } : { kind: "error", msg: res.error });
    });
  };

  // Vorschau: Ping + Markdown-fähige Nachricht, wie sie der Bot postet.
  const pingPrefix = pingRoleId ? `<@&${pingRoleId}> ` : "";
  const previewMessage =
    pingPrefix +
    (message.trim() || DEFAULT_MESSAGE)
      .replaceAll("{user}", "<@123>")
      .replaceAll("{age}", " 🎂 21 Jahre!");

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card p-6">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Geburtstags-Ankündigungen</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Postet zum Tagesbeginn (Mitternacht Serverzeit) eine Nachricht für jeden, der
              an dem Tag Geburtstag hat und die Ankündigung in seinem Profil erlaubt.
            </p>
          </div>
          <input
            type="checkbox"
            name="birthdayEnabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only"
          />
          <span
            className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
              enabled ? "bg-brand-gradient" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5" : ""
              }`}
            />
          </span>
        </label>

        {enabled && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Channel</label>
              <ChannelPicker
                name="birthdayChannelId"
                defaultValue={initial.birthdayChannelId}
                value={channelId}
                channels={channels}
                allowedTypes={[0, 5]}
                placeholder="— Channel wählen —"
                onChange={(v) => setChannelId(v ?? "")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Rolle pingen (optional)
              </label>
              <select
                name="birthdayPingRoleId"
                value={pingRoleId}
                onChange={(e) => setPingRoleId(e.target.value)}
                className="input"
              >
                <option value="">— keine Rolle pingen —</option>
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Nachricht</label>
              <textarea
                name="birthdayMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={DEFAULT_MESSAGE}
                className="input min-h-[60px] w-full resize-y"
              />
              <p className="mt-1 text-xs text-ink-subtle">
                Platzhalter: <code className="rounded bg-bg-elevated px-1 py-0.5">{"{user}"}</code> ={" "}
                Erwähnung, <code className="rounded bg-bg-elevated px-1 py-0.5">{"{age}"}</code> ={" "}
                Alter (nur wenn der User sein Jahr angegeben hat, sonst leer). Leer = Standard.
              </p>
            </div>

            <MessagePreview
              text={previewMessage}
              botName={bot.name}
              botAvatarUrl={bot.avatarUrl}
            />
          </div>
        )}
      </section>

      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border border-line bg-bg-card/95 px-5 py-3 shadow-card-lg backdrop-blur">
        <span className="text-xs text-ink-subtle">
          User setzen ihren Geburtstag selbst mit{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 text-[11px]">/geburtstag setzen</code>.
        </span>
        <div className="flex items-center gap-3">
          {feedback && (
            <span className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
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
