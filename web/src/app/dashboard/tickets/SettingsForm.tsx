"use client";

import { useEffect, useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { saveTicketSettings } from "./actions";

interface Initial {
  ticketsEnabled: boolean;
  ticketChannelId: string | null;
  ticketTranscriptEnabled: boolean;
  ticketTranscriptChannelId: string | null;
  ticketRatingEnabled: boolean;
  ticketRatingChannelId: string | null;
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
  const [transcriptOn, setTranscriptOn] = useState(initial.ticketTranscriptEnabled);
  const [ratingOn, setRatingOn] = useState(initial.ticketRatingEnabled);
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
          <div className="pb-4 space-y-4">
            <div>
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
          </div>
        </SubMenu>
      </div>

      {/* Transkript */}
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="ticketTranscriptEnabled"
          label="Transkript beim Schließen"
          description="Bot postet eine Text-Datei mit dem kompletten Verlauf in einen Archiv-Channel."
          defaultChecked={initial.ticketTranscriptEnabled}
          onCheckedChange={setTranscriptOn}
        />
        <SubMenu open={transcriptOn} allowOverflow>
          <div className="pb-4">
            <span className="mb-1.5 block text-sm font-medium text-ink">Transkript-Channel</span>
            <ChannelPicker
              name="ticketTranscriptChannelId"
              defaultValue={initial.ticketTranscriptChannelId}
              channels={channels}
              allowedTypes={[0, 5]}
              placeholder="— Channel wählen —"
            />
          </div>
        </SubMenu>
      </div>

      {/* Bewertung */}
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="ticketRatingEnabled"
          label="Bewertung nach Ticket-Schließen"
          description="User bekommt eine DM mit 1-5 Sterne-Buttons + Kommentar-Modal. Bewertung wird im konfigurierten Channel gepostet."
          defaultChecked={initial.ticketRatingEnabled}
          onCheckedChange={setRatingOn}
        />
        <SubMenu open={ratingOn} allowOverflow>
          <div className="pb-4">
            <span className="mb-1.5 block text-sm font-medium text-ink">Bewertungen-Channel</span>
            <ChannelPicker
              name="ticketRatingChannelId"
              defaultValue={initial.ticketRatingChannelId}
              channels={channels}
              allowedTypes={[0, 5]}
              placeholder="— Channel wählen —"
            />
            <p className="mt-1.5 text-xs text-ink-subtle">
              Leer = Bewertung wird nur in der DB gespeichert (zu sehen in der Mod-Statistik).
            </p>
          </div>
        </SubMenu>
      </div>

      {!enabled && (
        <input type="hidden" name="ticketChannelId" value={initial.ticketChannelId ?? ""} />
      )}
      {!transcriptOn && (
        <input
          type="hidden"
          name="ticketTranscriptChannelId"
          value={initial.ticketTranscriptChannelId ?? ""}
        />
      )}
      {!ratingOn && (
        <input
          type="hidden"
          name="ticketRatingChannelId"
          value={initial.ticketRatingChannelId ?? ""}
        />
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
