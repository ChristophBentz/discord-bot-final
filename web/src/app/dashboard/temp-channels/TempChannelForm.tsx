"use client";

import { useEffect, useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
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

export function TempChannelForm({ initial, triggers, channels }: Props) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.tempChannelEnabled);
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
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
          <Toggle
            name="tempChannelEnabled"
            label="Temp-Voice-Channels aktiv"
            description="Bot erstellt private Voice-Channels, wenn jemand einen Trigger-Channel betritt."
            defaultChecked={initial.tempChannelEnabled}
            onCheckedChange={setEnabled}
          />
          <SubMenu open={enabled} allowOverflow>
            <div className="space-y-4 pb-4">
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink">
                  Kategorie (optional)
                </span>
                <ChannelPicker
                  name="tempChannelCategoryId"
                  defaultValue={initial.tempChannelCategoryId}
                  channels={channels}
                  allowedTypes={[4]}
                  groupByCategory={false}
                  placeholder="— Keine, nutze Kategorie des Trigger-Channels —"
                />
                <p className="mt-1.5 text-xs text-ink-subtle">
                  Wenn gesetzt, werden neue Temp-Channels unter dieser Kategorie angelegt.
                </p>
              </div>

              <div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    Default Name-Template
                  </span>
                  <input
                    name="tempChannelNameTemplate"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    maxLength={90}
                    className="input"
                  />
                </label>
                <p className="mt-1.5 text-xs text-ink-subtle">
                  Wird genutzt, wenn ein Trigger kein eigenes Template hat. Platzhalter:{" "}
                  <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
                    {"{nick}"}
                  </code>{" "}
                  <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
                    {"{user}"}
                  </code>
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                <strong>Wichtig:</strong> Bot braucht <code className="font-mono">Manage
                Channels</code> + <code className="font-mono">Move Members</code>. Der Owner des
                Temp-Channels bekommt Manage/Mute/Move-Permissions für seinen eigenen Channel.
              </div>
            </div>
          </SubMenu>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
            {isPending ? "Speichere…" : "Allgemein speichern"}
          </button>
          {feedback && (
            <span
              className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}
            >
              {feedback.msg}
            </span>
          )}
        </div>
      </form>

      {/* Trigger-Liste — eigene Add/Delete-Actions */}
      <div className="card p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Trigger-Channels</h2>
          <span className="badge">{triggers.length}</span>
        </div>
        <p className="mb-4 text-sm text-ink-muted">
          Lege beliebig viele Trigger an — z.B. „+2 Leute", „+5 Leute", „+10 Leute". Jeder mit
          eigenem User-Limit.
        </p>
        <TriggerEditor triggers={triggers} channels={channels} />
      </div>
    </div>
  );
}
