"use client";

import type { ReactNode } from "react";

interface MessagePreviewProps {
  text: string;
  botName: string;
  botAvatarUrl: string | null;
  /** Optionales Label über der Vorschau, default: "Vorschau (so sieht's im Discord aus)" */
  label?: string;
  /** Optionaler Hinweistext unter der Vorschau */
  hint?: string;
  /** Wenn leer = zeigt „leer — keine Nachricht wird gesendet". Wenn null = zeigt gar nichts an */
  emptyText?: string | null;
  /** Optionales Embed unter dem Content (für Free-Games etc.) */
  embed?: ReactNode;
}

// Minimaler Discord-Markdown-Renderer für die Vorschau.
// Unterstützt: **fett**, *kursiv*, __underline__, ~~strike~~, `code`,
// <@123>/<@&123>/<#123> → schöne Mention-Bubbles
function renderMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let idx = 0;
  const regex =
    /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|__([^_\n]+)__|~~([^~\n]+)~~|`([^`\n]+)`|<@&(\d+)>|<@!?(\d+)>|<#(\d+)>|@(everyone|here)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) parts.push(<strong key={idx++}>{match[1]}</strong>);
    else if (match[2]) parts.push(<em key={idx++}>{match[2]}</em>);
    else if (match[3]) parts.push(<u key={idx++}>{match[3]}</u>);
    else if (match[4]) parts.push(<s key={idx++}>{match[4]}</s>);
    else if (match[5])
      parts.push(
        <code key={idx++} className="rounded bg-bg-elevated px-1 py-0.5 font-mono text-[12px]">
          {match[5]}
        </code>,
      );
    else if (match[6])
      parts.push(
        <span key={idx++} className="rounded bg-brand/20 px-1 text-brand-light font-medium">
          @rolle
        </span>,
      );
    else if (match[7])
      parts.push(
        <span key={idx++} className="rounded bg-brand/20 px-1 text-brand-light font-medium">
          @user
        </span>,
      );
    else if (match[8])
      parts.push(
        <span key={idx++} className="rounded bg-brand/20 px-1 text-brand-light font-medium">
          #channel
        </span>,
      );
    else if (match[9])
      parts.push(
        <span key={idx++} className="rounded bg-amber-500/20 px-1 text-amber-300 font-medium">
          @{match[9]}
        </span>,
      );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function MessagePreview({
  text,
  botName,
  botAvatarUrl,
  label = "Vorschau (so sieht's im Discord aus)",
  hint,
  emptyText = "leer — keine Nachricht wird gesendet",
  embed,
}: MessagePreviewProps) {
  const initial = (botName[0] ?? "B").toUpperCase();
  return (
    <div className="rounded-2xl border border-line bg-bg-elevated/40 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </div>
      <div className="flex items-start gap-3 rounded-lg bg-bg-card p-3">
        {botAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={botAvatarUrl}
            alt={botName}
            className="h-9 w-9 shrink-0 rounded-full ring-1 ring-line"
          />
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">{botName}</span>
            <span className="rounded bg-brand/20 px-1 py-0.5 text-[9px] font-semibold text-brand-light">
              APP
            </span>
            <span className="text-[11px] text-ink-subtle">heute · jetzt</span>
          </div>
          {text.trim() ? (
            <div className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">
              {renderMarkdown(text)}
            </div>
          ) : emptyText !== null ? (
            <div className="mt-0.5 text-sm italic text-ink-subtle">{emptyText}</div>
          ) : null}
          {embed && <div className="mt-2">{embed}</div>}
        </div>
      </div>
      {hint && <p className="mt-2 text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}
