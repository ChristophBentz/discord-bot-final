"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/DialogProvider";
import { closeTicket, replyToTicket } from "../actions";

export function ReplyForm({ ticketId, closed }: { ticketId: number; closed: boolean }) {
  const router = useRouter();
  const dialog = useDialog();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"reply" | "close" | null>(null);
  const [isPending, startTransition] = useTransition();

  if (closed) {
    return (
      <div className="rounded-xl border border-line bg-bg-elevated/40 px-4 py-3 text-sm text-ink-muted">
        Dieses Ticket ist geschlossen. Antworten nicht mehr möglich.
      </div>
    );
  }

  const onReply = () => {
    if (!content.trim()) return;
    setError(null);
    setPending("reply");
    startTransition(async () => {
      const res = await replyToTicket(ticketId, content);
      if (res.ok) {
        setContent("");
        router.refresh();
      } else setError(res.error);
      setPending(null);
    });
  };

  const onClose = async () => {
    if (
      !(await dialog.confirm({
        title: "Ticket schließen",
        message: "Der Ersteller kann danach nicht mehr antworten.",
        confirmLabel: "Schließen",
      }))
    )
      return;
    setError(null);
    setPending("close");
    startTransition(async () => {
      const res = await closeTicket(ticketId);
      if (res.ok) {
        router.refresh();
      } else setError(res.error);
      setPending(null);
    });
  };

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Antwort an den User schreiben…"
        maxLength={2000}
        className="input resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="btn-secondary disabled:opacity-60"
        >
          {pending === "close" ? "Schließe…" : "Ticket schließen"}
        </button>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-rose-400">{error}</span>}
          <span className="text-xs text-ink-subtle">{content.length} / 2000</span>
          <button
            type="button"
            onClick={onReply}
            disabled={isPending || !content.trim()}
            className="btn-primary disabled:opacity-60"
          >
            {pending === "reply" ? "Sende…" : "Antworten"}
          </button>
        </div>
      </div>
    </div>
  );
}
