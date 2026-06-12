"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { MessagePreview } from "@/components/MessagePreview";
import {
  sendBlocks,
  sendEmbed,
  sendFile,
  sendPoll,
  sendText,
  type BlocksSpec,
  type EmbedSpec,
  type MessageBlock,
  type PollSpec,
} from "./actions";

// Editor-Modell für den Baukasten: ein Block pro Zeile, Bilder als
// Mehrzeilen-Eingabe (eine URL pro Zeile).
interface BlockDraft {
  id: number;
  type: "text" | "image" | "separator";
  text: string;
  imageUrls: string;
  large: boolean;
}

function draftsToSpec(drafts: BlockDraft[], accentColor: number | null): BlocksSpec {
  const blocks: MessageBlock[] = drafts.map((d) => {
    if (d.type === "text") return { type: "text", content: d.text.trim() };
    if (d.type === "image") {
      return {
        type: "image",
        urls: d.imageUrls
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean),
      };
    }
    return { type: "separator", large: d.large };
  });
  return { blocks, accentColor };
}

// Renders ein Discord-Embed innerhalb der MessagePreview (für Embed-Tab)
function EmbedBody({ spec }: { spec: EmbedSpec }) {
  const colorHex = "#" + (spec.color ?? 0xa855f7).toString(16).padStart(6, "0");
  if (!spec.title && !spec.description && !spec.imageUrl && !spec.thumbnailUrl && !spec.footerText) {
    return (
      <div className="rounded border-l-2 border-line bg-bg-elevated/40 px-3 py-2 text-xs italic text-ink-subtle">
        leerer Embed
      </div>
    );
  }
  return (
    <div
      className="flex max-w-[480px] gap-2 rounded border-l-[3px] bg-bg-elevated/60 p-3"
      style={{ borderLeftColor: colorHex }}
    >
      <div className="flex-1 space-y-1.5">
        {spec.title && (
          <div className="font-semibold text-ink">{spec.title}</div>
        )}
        {spec.description && (
          <div className="whitespace-pre-wrap break-words text-sm text-ink-muted">
            {spec.description}
          </div>
        )}
        {spec.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={spec.imageUrl}
            alt=""
            className="mt-1 max-h-48 rounded border border-line object-cover"
          />
        )}
        {spec.footerText && (
          <div className="mt-2 text-[11px] text-ink-subtle">{spec.footerText}</div>
        )}
      </div>
      {spec.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={spec.thumbnailUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded border border-line object-cover"
        />
      )}
    </div>
  );
}

// Renders eine Discord-Native-Poll-Anzeige
function PollBody({
  question,
  answers,
  multi,
  durationHours,
}: {
  question: string;
  answers: string[];
  multi: boolean;
  durationHours: number;
}) {
  if (!question.trim() && answers.every((a) => !a.trim())) {
    return (
      <div className="rounded border border-line bg-bg-elevated/40 px-3 py-2 text-xs italic text-ink-subtle">
        leere Umfrage
      </div>
    );
  }
  return (
    <div className="max-w-[480px] rounded-xl border border-line bg-bg-elevated/60 p-4">
      <div className="text-sm font-semibold text-ink">{question || "(keine Frage)"}</div>
      <ul className="mt-3 space-y-1.5">
        {answers
          .map((a) => a.trim())
          .filter(Boolean)
          .map((a, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-lg border border-line bg-bg-card px-3 py-2 text-sm"
            >
              <span className="grid h-4 w-4 place-items-center rounded-full border border-line">
                <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
              </span>
              <span className="flex-1 text-ink">{a}</span>
            </li>
          ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-subtle">
        <span>0 votes · endet in {durationHours}h</span>
        {multi && <span className="rounded bg-bg-elevated px-1.5 py-0.5">Mehrfachauswahl</span>}
      </div>
    </div>
  );
}

// Datei-Attachment-Platzhalter
function FileBody({ file }: { file: File | null }) {
  if (!file) {
    return (
      <div className="rounded border border-dashed border-line bg-bg-elevated/40 px-3 py-2 text-xs italic text-ink-subtle">
        noch keine Datei gewählt
      </div>
    );
  }
  return (
    <div className="flex max-w-[420px] items-center gap-3 rounded-lg border border-line bg-bg-elevated/60 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-bg-card text-lg">
        📎
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{file.name}</div>
        <div className="text-[11px] text-ink-subtle">
          {(file.size / 1024).toFixed(1)} KB
        </div>
      </div>
    </div>
  );
}

type Tab = "text" | "embed" | "blocks" | "poll" | "file";

// 2D-Line-Icons für die Tabs (passt zum Sidebar-Style)
// Discord-ähnliche Vorschau der Baukasten-Nachricht.
function BlocksBody({ drafts, accentColor }: { drafts: BlockDraft[]; accentColor: string | null }) {
  if (drafts.length === 0) {
    return (
      <div className="rounded border-l-2 border-line bg-bg-elevated/40 px-3 py-2 text-xs italic text-ink-subtle">
        keine Blöcke
      </div>
    );
  }
  const inner = (
    <div className="max-w-[480px] space-y-2">
      {drafts.map((b) => {
        if (b.type === "text") {
          return (
            <div key={b.id} className="whitespace-pre-wrap break-words text-sm text-ink-muted">
              {b.text || <span className="italic text-ink-subtle">leerer Text-Block</span>}
            </div>
          );
        }
        if (b.type === "image") {
          const urls = b.imageUrls
            .split("\n")
            .map((u) => u.trim())
            .filter(Boolean)
            .slice(0, 10);
          if (urls.length === 0) {
            return (
              <div key={b.id} className="rounded border border-dashed border-line px-3 py-4 text-center text-xs italic text-ink-subtle">
                Bild-Block ohne URL
              </div>
            );
          }
          return (
            <div key={b.id} className={`grid gap-1 ${urls.length > 1 ? "grid-cols-2" : ""}`}>
              {urls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="max-h-48 w-full rounded border border-line object-cover" />
              ))}
            </div>
          );
        }
        return <hr key={b.id} className={`border-line ${b.large ? "my-4" : "my-2"}`} />;
      })}
    </div>
  );
  if (accentColor) {
    return (
      <div
        className="max-w-[500px] rounded border-l-[3px] bg-bg-elevated/60 p-3"
        style={{ borderLeftColor: accentColor }}
      >
        {inner}
      </div>
    );
  }
  return inner;
}

function TabIcon({ name }: { name: Tab }) {
  const props = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "text":
      return (
        <svg {...props}>
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "embed":
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M7 13h7M7 16h10" />
        </svg>
      );
    case "blocks":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="6" rx="1.5" />
          <rect x="3" y="11" width="18" height="4" rx="1.5" />
          <rect x="3" y="17" width="12" height="4" rx="1.5" />
        </svg>
      );
    case "poll":
      return (
        <svg {...props}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "file":
      return (
        <svg {...props}>
          <path d="M21.44 11.05 12.25 20.24a6 6 0 1 1-8.49-8.49l8.57-8.57a4 4 0 0 1 5.66 5.66l-8.58 8.57a2 2 0 0 1-2.83-2.83l7.93-7.93" />
        </svg>
      );
  }
}

export interface RoleOption {
  roleId: string;
  name: string;
  color: number;
}

function intToHex(color: number, fallback = "#a1a1aa"): string {
  if (!color) return fallback;
  return "#" + color.toString(16).padStart(6, "0");
}

// Kleine Inline-Komponente: Dropdown zum Einfügen eines Rollen-Mention.
function MentionPicker({
  roles,
  onPick,
}: {
  roles: RoleOption[];
  onPick: (roleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = roles.filter((r) =>
    search ? r.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg-elevated/60 px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-brand/40 hover:text-ink"
      >
        @ Rolle erwähnen
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border border-line bg-bg-elevated shadow-card-lg">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rolle suchen…"
              className="w-full rounded-lg bg-bg-card px-3 py-2 text-sm outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-ink-muted">
                Keine Rolle gefunden.
              </div>
            ) : (
              filtered.map((r) => {
                const c = intToHex(r.color);
                return (
                  <button
                    key={r.roleId}
                    type="button"
                    onClick={() => {
                      onPick(r.roleId);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-bg-hover"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                    <span className="truncate" style={{ color: c }}>
                      @{r.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-brand-gradient text-white"
          : "border border-line bg-bg-elevated/60 text-ink-muted hover:border-brand/40 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function ComposeForm({
  channels,
  roles,
  bot,
}: {
  channels: ChannelOption[];
  roles: RoleOption[];
  bot: { name: string; avatarUrl: string | null };
}) {
  const [tab, setTab] = useState<Tab>("text");
  const [channelId, setChannelId] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // text
  const [text, setText] = useState("");

  // embed
  const [embedTitle, setEmbedTitle] = useState("");
  const [embedDesc, setEmbedDesc] = useState("");
  const [embedColor, setEmbedColor] = useState("#a855f7");
  const [embedImage, setEmbedImage] = useState("");
  const [embedThumb, setEmbedThumb] = useState("");
  const [embedFooter, setEmbedFooter] = useState("");
  const [embedExtraContent, setEmbedExtraContent] = useState("");

  // blocks (Baukasten)
  const blockIdRef = useRef(1);
  const [blockDrafts, setBlockDrafts] = useState<BlockDraft[]>([]);
  const [blocksAccentEnabled, setBlocksAccentEnabled] = useState(false);
  const [blocksAccentColor, setBlocksAccentColor] = useState("#a855f7");

  const addBlock = (type: BlockDraft["type"]) =>
    setBlockDrafts((prev) => [
      ...prev,
      { id: blockIdRef.current++, type, text: "", imageUrls: "", large: false },
    ]);

  const updateBlock = (id: number, patch: Partial<BlockDraft>) =>
    setBlockDrafts((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const removeBlock = (id: number) =>
    setBlockDrafts((prev) => prev.filter((b) => b.id !== id));

  const moveBlock = (id: number, dir: -1 | 1) =>
    setBlockDrafts((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });

  // poll
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollAnswers, setPollAnswers] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState(24);
  const [pollMulti, setPollMulti] = useState(false);

  // file
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");

  const guard = (): boolean => {
    if (!channelId) {
      setFeedback({ kind: "error", msg: "Bitte einen Channel auswählen." });
      return false;
    }
    return true;
  };

  const ok = () => {
    setFeedback({ kind: "ok", msg: "Gesendet." });
    if (tab === "text") setText("");
    if (tab === "embed") {
      setEmbedTitle("");
      setEmbedDesc("");
      setEmbedImage("");
      setEmbedThumb("");
      setEmbedFooter("");
      setEmbedExtraContent("");
    }
    if (tab === "blocks") {
      setBlockDrafts([]);
    }
    if (tab === "poll") {
      setPollQuestion("");
      setPollAnswers(["", ""]);
    }
    if (tab === "file") {
      setFile(null);
      setFileContent("");
    }
  };

  const fail = (msg: string) => setFeedback({ kind: "error", msg });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (!guard()) return;

    startTransition(async () => {
      if (tab === "text") {
        if (!text.trim()) return fail("Text ist leer.");
        const r = await sendText({ channelId, content: text });
        r.ok ? ok() : fail(r.error);
      } else if (tab === "embed") {
        if (!embedTitle.trim() && !embedDesc.trim())
          return fail("Embed braucht mindestens Titel oder Beschreibung.");
        const spec: EmbedSpec = {
          title: embedTitle.trim() || undefined,
          description: embedDesc.trim() || undefined,
          color: embedColor ? parseInt(embedColor.replace("#", ""), 16) : undefined,
          imageUrl: embedImage.trim() || undefined,
          thumbnailUrl: embedThumb.trim() || undefined,
          footerText: embedFooter.trim() || undefined,
        };
        const r = await sendEmbed({
          channelId,
          content: embedExtraContent.trim() || undefined,
          embed: spec,
        });
        r.ok ? ok() : fail(r.error);
      } else if (tab === "blocks") {
        if (blockDrafts.length === 0) return fail("Füge mindestens einen Block hinzu.");
        const spec = draftsToSpec(
          blockDrafts,
          blocksAccentEnabled ? parseInt(blocksAccentColor.replace("#", ""), 16) : null,
        );
        const hasContent = spec.blocks.some(
          (b) => (b.type === "text" && b.content) || (b.type === "image" && b.urls.length > 0),
        );
        if (!hasContent) return fail("Mindestens ein Text- oder Bild-Block muss gefüllt sein.");
        const r = await sendBlocks({ channelId, blocks: spec });
        r.ok ? ok() : fail(r.error);
      } else if (tab === "poll") {
        const answers = pollAnswers.map((a) => a.trim()).filter((a) => a);
        if (!pollQuestion.trim()) return fail("Frage ist leer.");
        if (answers.length < 2) return fail("Mindestens 2 Antworten.");
        const poll: PollSpec = {
          question: pollQuestion,
          answers: answers.map((text) => ({ text })),
          durationHours: pollDuration,
          allowMultiselect: pollMulti,
        };
        const r = await sendPoll({ channelId, poll });
        r.ok ? ok() : fail(r.error);
      } else if (tab === "file") {
        if (!file) return fail("Bitte eine Datei wählen.");
        if (file.size > 8 * 1024 * 1024) return fail("Datei > 8 MB.");
        const reader = new FileReader();
        const base64: string = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const s = reader.result as string;
            resolve(s.split(",")[1] ?? "");
          };
          reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
          reader.readAsDataURL(file);
        });
        const r = await sendFile({
          channelId,
          content: fileContent.trim() || undefined,
          fileBase64: base64,
          fileName: file.name,
        });
        r.ok ? ok() : fail(r.error);
      }
    });
  };

  const setAnswer = (idx: number, value: string) =>
    setPollAnswers((prev) => prev.map((a, i) => (i === idx ? value : a)));

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "text"} onClick={() => setTab("text")}>
          <TabIcon name="text" /> Text
        </TabButton>
        <TabButton active={tab === "embed"} onClick={() => setTab("embed")}>
          <TabIcon name="embed" /> Embed
        </TabButton>
        <TabButton active={tab === "blocks"} onClick={() => setTab("blocks")}>
          <TabIcon name="blocks" /> Baukasten
        </TabButton>
        <TabButton active={tab === "poll"} onClick={() => setTab("poll")}>
          <TabIcon name="poll" /> Umfrage
        </TabButton>
        <TabButton active={tab === "file"} onClick={() => setTab("file")}>
          <TabIcon name="file" /> Datei
        </TabButton>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Channel</span>
        <ChannelPicker
          value={channelId}
          onChange={(v) => setChannelId(v ?? "")}
          channels={channels}
          allowedTypes={[0, 5]}
          placeholder="— Channel wählen —"
        />
      </div>

      {tab === "text" && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Nachricht</span>
            <MentionPicker
              roles={roles}
              onPick={(id) =>
                setText((v) => (v ? `${v} <@&${id}> ` : `<@&${id}> `))
              }
            />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={5000}
            placeholder="Discord-Markdown wird unterstützt — **fett**, *kursiv*, ```code```, etc."
            className="input min-h-[120px] resize-y w-full"
          />
          <p className="mt-1 text-xs text-ink-subtle">
            {text.length} / 5000
            {text.length > 2000 && (
              <span className="ml-2 text-amber-400">
                · wird in {Math.ceil(text.length / 2000)} Discord-Nachrichten gesplittet
              </span>
            )}
          </p>
        </div>
      )}

      {tab === "embed" && (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">
                Optionale Nachricht vor dem Embed
              </span>
              <MentionPicker
                roles={roles}
                onPick={(id) =>
                  setEmbedExtraContent((v) =>
                    v ? `${v} <@&${id}> ` : `<@&${id}> `,
                  )
                }
              />
            </div>
            <input
              value={embedExtraContent}
              onChange={(e) => setEmbedExtraContent(e.target.value)}
              maxLength={2000}
              placeholder="leer = nur das Embed wird gepostet"
              className="input w-full"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Titel</span>
              <input
                value={embedTitle}
                onChange={(e) => setEmbedTitle(e.target.value)}
                maxLength={256}
                className="input w-full"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Farbe</span>
              <input
                type="color"
                value={embedColor}
                onChange={(e) => setEmbedColor(e.target.value)}
                className="h-[42px] w-full cursor-pointer rounded-xl border border-line bg-bg-elevated"
              />
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Beschreibung</span>
            <textarea
              value={embedDesc}
              onChange={(e) => setEmbedDesc(e.target.value)}
              rows={5}
              maxLength={40960}
              className="input min-h-[100px] resize-y w-full"
            />
            <p className="mt-1 text-xs text-ink-subtle">
              {embedDesc.length} / 40960
              {embedDesc.length > 4096 && (
                <span className="ml-2 text-amber-400">
                  · wird in {Math.ceil(embedDesc.length / 4096)} Embeds gesplittet (in einer Discord-Nachricht)
                </span>
              )}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Bild-URL (optional)</span>
              <input
                value={embedImage}
                onChange={(e) => setEmbedImage(e.target.value)}
                placeholder="https://…"
                className="input w-full"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Thumbnail-URL (optional)
              </span>
              <input
                value={embedThumb}
                onChange={(e) => setEmbedThumb(e.target.value)}
                placeholder="https://…"
                className="input w-full"
              />
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Footer (optional)</span>
            <input
              value={embedFooter}
              onChange={(e) => setEmbedFooter(e.target.value)}
              maxLength={2048}
              className="input w-full"
            />
          </div>
        </div>
      )}

      {tab === "blocks" && (
        <div className="space-y-4">
          <p className="text-xs text-ink-muted">
            Baue die Nachricht aus Blöcken auf — Text, Bilder und Trennlinien beliebig
            stapeln und anordnen. Ideal für Welcome-Channels, Regeln oder Ankündigungen.
          </p>

          {blockDrafts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
              Noch keine Blöcke — unten einen hinzufügen.
            </div>
          )}

          <div className="space-y-2">
            {blockDrafts.map((b, i) => (
              <div key={b.id} className="rounded-xl border border-line bg-bg-elevated/40">
                <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                    {b.type === "text" ? "Text" : b.type === "image" ? "Bild" : "Trennlinie"}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveBlock(b.id, -1)}
                      disabled={i === 0}
                      title="Nach oben"
                      className="grid h-6 w-6 place-items-center rounded text-ink-subtle hover:bg-bg-hover hover:text-ink disabled:opacity-30"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(b.id, 1)}
                      disabled={i === blockDrafts.length - 1}
                      title="Nach unten"
                      className="grid h-6 w-6 place-items-center rounded text-ink-subtle hover:bg-bg-hover hover:text-ink disabled:opacity-30"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(b.id)}
                      title="Block entfernen"
                      className="grid h-6 w-6 place-items-center rounded text-ink-subtle hover:bg-rose-500/15 hover:text-rose-400"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  {b.type === "text" && (
                    <div>
                      <div className="mb-1 flex justify-end">
                        <MentionPicker
                          roles={roles}
                          onPick={(id) =>
                            updateBlock(b.id, {
                              text: b.text ? `${b.text} <@&${id}> ` : `<@&${id}> `,
                            })
                          }
                        />
                      </div>
                      <textarea
                        value={b.text}
                        onChange={(e) => updateBlock(b.id, { text: e.target.value })}
                        rows={3}
                        maxLength={4000}
                        placeholder="Markdown wird unterstützt — # Überschrift, **fett**, {…}"
                        className="input min-h-[70px] w-full resize-y !py-2 text-sm"
                      />
                    </div>
                  )}
                  {b.type === "image" && (
                    <div>
                      <textarea
                        value={b.imageUrls}
                        onChange={(e) => updateBlock(b.id, { imageUrls: e.target.value })}
                        rows={2}
                        placeholder={"https://… (eine Bild-URL pro Zeile, max. 10 — mehrere = Galerie)"}
                        className="input w-full resize-y !py-2 font-mono text-xs"
                      />
                    </div>
                  )}
                  {b.type === "separator" && (
                    <label className="flex items-center gap-2 text-sm text-ink-muted">
                      <input
                        type="checkbox"
                        checked={b.large}
                        onChange={(e) => updateBlock(b.id, { large: e.target.checked })}
                        className="h-4 w-4 rounded border-line accent-brand"
                      />
                      Großer Abstand
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addBlock("text")} className="btn-secondary !px-3 !py-1.5 text-xs">
              + Text
            </button>
            <button type="button" onClick={() => addBlock("image")} className="btn-secondary !px-3 !py-1.5 text-xs">
              + Bild
            </button>
            <button type="button" onClick={() => addBlock("separator")} className="btn-secondary !px-3 !py-1.5 text-xs">
              + Trennlinie
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg-elevated/40 px-3 py-2.5">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={blocksAccentEnabled}
                onChange={(e) => setBlocksAccentEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-brand"
              />
              Container mit Akzentleiste
            </label>
            {blocksAccentEnabled && (
              <input
                type="color"
                value={blocksAccentColor}
                onChange={(e) => setBlocksAccentColor(e.target.value)}
                className="h-8 w-16 cursor-pointer rounded-lg border border-line bg-bg-elevated"
              />
            )}
            <span className="text-xs text-ink-subtle">
              fasst alle Blöcke zusammen — wie die farbige Leiste bei Embeds
            </span>
          </div>
        </div>
      )}

      {tab === "poll" && (
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Frage</span>
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              maxLength={300}
              placeholder="Was wollt ihr wissen?"
              className="input w-full"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Antworten ({pollAnswers.length}/10)</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setPollAnswers((p) => (p.length < 10 ? [...p, ""] : p))
                  }
                  disabled={pollAnswers.length >= 10}
                  className="rounded-md border border-line bg-bg-elevated/60 px-2 py-0.5 text-xs text-ink-muted hover:border-brand/40 hover:text-ink disabled:opacity-40"
                >
                  + Antwort
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {pollAnswers.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={a}
                    onChange={(e) => setAnswer(i, e.target.value)}
                    maxLength={55}
                    placeholder={`Antwort ${i + 1}`}
                    className="input flex-1"
                  />
                  {pollAnswers.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPollAnswers((p) => p.filter((_, idx) => idx !== i))
                      }
                      title="Entfernen"
                      className="grid h-[42px] w-[42px] place-items-center rounded-xl border border-line bg-bg-elevated/60 text-ink-subtle hover:bg-rose-500/15 hover:text-rose-400"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="m6 6 12 12M18 6 6 18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Dauer (Stunden)</span>
              <select
                value={pollDuration}
                onChange={(e) => setPollDuration(Number(e.target.value))}
                className="input"
              >
                <option value={1}>1 Stunde</option>
                <option value={4}>4 Stunden</option>
                <option value={8}>8 Stunden</option>
                <option value={24}>24 Stunden (1 Tag)</option>
                <option value={72}>3 Tage</option>
                <option value={168}>7 Tage</option>
                <option value={336}>14 Tage</option>
                <option value={672}>28 Tage</option>
              </select>
            </label>
            <label className="flex items-end gap-2">
              <input
                type="checkbox"
                checked={pollMulti}
                onChange={(e) => setPollMulti(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-brand"
              />
              <span className="text-sm text-ink">Mehrfachauswahl erlauben</span>
            </label>
          </div>
        </div>
      )}

      {tab === "file" && (
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Datei (max. 8 MB)</span>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-bg-elevated/60 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-bg-hover"
            />
            {file && (
              <p className="mt-1.5 text-xs text-ink-subtle">
                {file.name} — {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Optionaler Begleittext</span>
              <MentionPicker
                roles={roles}
                onPick={(id) =>
                  setFileContent((v) => (v ? `${v} <@&${id}> ` : `<@&${id}> `))
                }
              />
            </div>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              rows={3}
              maxLength={2000}
              className="input min-h-[60px] resize-y w-full"
            />
          </div>
        </div>
      )}

      {/* Live-Vorschau pro Tab */}
      {tab === "text" && (
        <MessagePreview
          text={text}
          botName={bot.name}
          botAvatarUrl={bot.avatarUrl}
          emptyText="leerer Text — Senden ist blockiert"
        />
      )}
      {tab === "embed" && (
        <MessagePreview
          text={embedExtraContent}
          botName={bot.name}
          botAvatarUrl={bot.avatarUrl}
          emptyText={null}
          embed={
            <EmbedBody
              spec={{
                title: embedTitle.trim() || undefined,
                description: embedDesc.trim() || undefined,
                color: embedColor
                  ? parseInt(embedColor.replace("#", ""), 16)
                  : undefined,
                imageUrl: embedImage.trim() || undefined,
                thumbnailUrl: embedThumb.trim() || undefined,
                footerText: embedFooter.trim() || undefined,
              }}
            />
          }
        />
      )}
      {tab === "blocks" && (
        <MessagePreview
          text=""
          botName={bot.name}
          botAvatarUrl={bot.avatarUrl}
          emptyText={null}
          embed={
            <BlocksBody
              drafts={blockDrafts}
              accentColor={blocksAccentEnabled ? blocksAccentColor : null}
            />
          }
        />
      )}
      {tab === "poll" && (
        <MessagePreview
          text=""
          botName={bot.name}
          botAvatarUrl={bot.avatarUrl}
          emptyText={null}
          embed={
            <PollBody
              question={pollQuestion}
              answers={pollAnswers}
              multi={pollMulti}
              durationHours={pollDuration}
            />
          }
        />
      )}
      {tab === "file" && (
        <MessagePreview
          text={fileContent}
          botName={bot.name}
          botAvatarUrl={bot.avatarUrl}
          emptyText={null}
          embed={<FileBody file={file} />}
        />
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
          {isPending ? "Sende…" : "Senden"}
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
  );
}
