"use client";

import { useEffect, useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { saveTicketSettings } from "./actions";

interface Initial {
  ticketsEnabled: boolean;
  ticketChannelId: string | null;
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
  channels,
}: {
  initial: Initial;
  channels: ChannelOption[];
}) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [enabled, setEnabled] = useState(initial.ticketsEnabled);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveTicketSettings(formData);
      setFeedback(res.ok ? { kind: "ok", msg: "Gespeichert. Panel wurde aktualisiert." } : { kind: "error", msg: res.error });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="ticketsEnabled"
          label="Ticket-System aktiv"
          description='Bot postet ein Panel mit "Ticket öffnen"-Button im konfigurierten Channel.'
          defaultChecked={initial.ticketsEnabled}
          onCheckedChange={setEnabled}
        />
        <SubMenu open={enabled} allowOverflow>
          <div className="pb-4">
            <span className="mb-1.5 block text-sm font-medium text-ink">Ticket-Channel</span>
            <ChannelPicker
              name="ticketChannelId"
              defaultValue={initial.ticketChannelId}
              channels={channels}
              allowedTypes={[0, 5]}
              placeholder="— Ticket-Channel wählen —"
            />
            <p className="mt-1.5 text-xs text-ink-subtle">
              In diesem Channel postet der Bot das Panel mit dem Button. Threads werden als
              Sub-Threads im Channel angelegt.
            </p>
          </div>
        </SubMenu>
      </div>

      {!enabled && (
        <input type="hidden" name="ticketChannelId" value={initial.ticketChannelId ?? ""} />
      )}

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
