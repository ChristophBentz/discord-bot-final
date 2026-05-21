"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { deleteMessage, editMessage, type EmbedSpec } from "./actions";

export interface MessageRow {
  id: number;
  channelId: string;
  channelName: string | null;
  messageId: string;
  type: "text" | "embed" | "poll" | "file";
  content: string | null;
  embed: EmbedSpec | null;
  pollQuestion: string | null;
  fileName: string | null;
  sentAt: string;
  editedAt: string | null;
}

const TYPE_LABEL: Record<MessageRow["type"], string> = {
  text: "📝 Text",
  embed: "📋 Embed",
  poll: "📊 Umfrage",
  file: "📎 Datei",
};

export function MessageHistory({
  messages,
  guildId,
}: {
  messages: MessageRow[];
  guildId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<MessageRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editEmbed, setEditEmbed] = useState<EmbedSpec>({});
  const [editFeedback, setEditFeedback] = useState<string | null>(null);

  const onDelete = (m: MessageRow) => {
    setPendingId(m.id);
    startTransition(async () => {
      await deleteMessage(m.id);
      router.refresh();
      setPendingId(null);
    });
  };

  const openEdit = (m: MessageRow) => {
    setEditing(m);
    setEditContent(m.content ?? "");
    setEditEmbed(m.embed ?? {});
    setEditFeedback(null);
  };

  const onSaveEdit = () => {
    if (!editing) return;
    setEditFeedback(null);
    startTransition(async () => {
      const body =
        editing.type === "embed"
          ? { content: editContent || undefined, embed: editEmbed }
          : { content: editContent };
      const res = await editMessage(editing.id, body);
      if (res.ok) {
        router.refresh();
        setEditing(null);
      } else {
        setEditFeedback(res.error);
      }
    });
  };

  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
        Noch nichts gesendet.
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {messages.map((m) => {
          const editable = m.type === "text" || m.type === "embed";
          const preview =
            m.type === "embed" && m.embed
              ? m.embed.title ?? m.embed.description ?? "(leerer Embed)"
              : m.type === "poll"
                ? m.pollQuestion ?? "(Umfrage)"
                : m.type === "file"
                  ? `📎 ${m.fileName ?? "Datei"}` + (m.content ? ` — ${m.content}` : "")
                  : m.content ?? "(leer)";
          return (
            <li
              key={m.id}
              className={`rounded-xl border border-line bg-bg-elevated/40 p-3 transition-opacity ${
                pendingId === m.id ? "opacity-40" : ""
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
                <span className="rounded bg-bg-elevated px-1.5 py-0.5 font-medium text-ink">
                  {TYPE_LABEL[m.type]}
                </span>
                <span>
                  in <span className="text-ink">#{m.channelName ?? m.channelId}</span>
                </span>
                <span>·</span>
                <span>{new Date(m.sentAt).toLocaleString("de-DE")}</span>
                {m.editedAt && <span>· bearbeitet</span>}
                <a
                  href={`https://discord.com/channels/${guildId}/${m.channelId}/${m.messageId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-brand hover:underline"
                >
                  In Discord öffnen ↗
                </a>
              </div>
              <div className="mb-2 line-clamp-2 text-sm text-ink-muted">{preview}</div>
              <div className="flex gap-2">
                {editable && (
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    disabled={isPending}
                    className="rounded-md border border-line bg-bg-elevated/60 px-2.5 py-1 text-xs text-ink-muted hover:border-brand/40 hover:text-ink disabled:opacity-40"
                  >
                    ✒️ Bearbeiten
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(m)}
                  disabled={isPending}
                  className="rounded-md border border-line bg-bg-elevated/60 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 disabled:opacity-40"
                >
                  🗑 Löschen
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Nachricht bearbeiten — ${editing ? TYPE_LABEL[editing.type] : ""}`}
        width="lg"
      >
        {editing?.type === "text" && (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              maxLength={2000}
              className="input min-h-[120px] resize-y w-full"
            />
            <p className="text-xs text-ink-subtle">{editContent.length} / 2000</p>
          </div>
        )}
        {editing?.type === "embed" && (
          <div className="space-y-3">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Nachricht über dem Embed (optional)
              </span>
              <input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={2000}
                className="input w-full"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink">Titel</span>
                <input
                  value={editEmbed.title ?? ""}
                  onChange={(e) => setEditEmbed({ ...editEmbed, title: e.target.value })}
                  maxLength={256}
                  className="input w-full"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink">Farbe</span>
                <input
                  type="color"
                  value={"#" + (editEmbed.color ?? 0xa855f7).toString(16).padStart(6, "0")}
                  onChange={(e) =>
                    setEditEmbed({
                      ...editEmbed,
                      color: parseInt(e.target.value.replace("#", ""), 16),
                    })
                  }
                  className="h-[42px] w-full cursor-pointer rounded-xl border border-line bg-bg-elevated"
                />
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Beschreibung</span>
              <textarea
                value={editEmbed.description ?? ""}
                onChange={(e) => setEditEmbed({ ...editEmbed, description: e.target.value })}
                rows={5}
                maxLength={4000}
                className="input min-h-[100px] resize-y w-full"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink">Bild-URL</span>
                <input
                  value={editEmbed.imageUrl ?? ""}
                  onChange={(e) => setEditEmbed({ ...editEmbed, imageUrl: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink">Thumbnail-URL</span>
                <input
                  value={editEmbed.thumbnailUrl ?? ""}
                  onChange={(e) =>
                    setEditEmbed({ ...editEmbed, thumbnailUrl: e.target.value })
                  }
                  className="input w-full"
                />
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Footer</span>
              <input
                value={editEmbed.footerText ?? ""}
                onChange={(e) => setEditEmbed({ ...editEmbed, footerText: e.target.value })}
                maxLength={2048}
                className="input w-full"
              />
            </div>
          </div>
        )}
        {editFeedback && (
          <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
            {editFeedback}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-lg border border-line bg-bg-elevated px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={isPending}
            className="btn-primary disabled:opacity-60"
          >
            {isPending ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </Modal>
    </>
  );
}
