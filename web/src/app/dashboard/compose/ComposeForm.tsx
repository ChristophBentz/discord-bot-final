"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import {
  sendEmbed,
  sendFile,
  sendPoll,
  sendText,
  type EmbedSpec,
  type PollSpec,
} from "./actions";

type Tab = "text" | "embed" | "poll" | "file";

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
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
}: {
  channels: ChannelOption[];
  roles: RoleOption[];
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
          📝 Text
        </TabButton>
        <TabButton active={tab === "embed"} onClick={() => setTab("embed")}>
          📋 Embed
        </TabButton>
        <TabButton active={tab === "poll"} onClick={() => setTab("poll")}>
          📊 Umfrage
        </TabButton>
        <TabButton active={tab === "file"} onClick={() => setTab("file")}>
          📎 Datei
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
