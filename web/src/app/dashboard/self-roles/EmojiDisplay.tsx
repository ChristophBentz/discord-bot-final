"use client";

import { useState } from "react";

interface ParsedEmoji {
  kind: "unicode" | "custom" | "invalid";
  text: string;
  id?: string;
  name?: string;
  animated?: boolean;
}

export function parseEmoji(raw: string | null | undefined): ParsedEmoji | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Custom: <:name:id> oder <a:name:id>
  const custom = trimmed.match(/^<(a?):([a-zA-Z0-9_]+):(\d+)>$/);
  if (custom) {
    return {
      kind: "custom",
      text: trimmed,
      name: custom[2]!,
      id: custom[3]!,
      animated: custom[1] === "a",
    };
  }

  // Shortcode :name: → kein valides Discord-API-Format
  if (/^:[a-zA-Z0-9_]+:$/.test(trimmed)) {
    return { kind: "invalid", text: trimmed };
  }

  // Unicode-Emoji (alles andere)
  return { kind: "unicode", text: trimmed };
}

export function EmojiDisplay({
  raw,
  size = 24,
}: {
  raw: string | null | undefined;
  size?: number;
}) {
  const parsed = parseEmoji(raw);
  const [imgFailed, setImgFailed] = useState(false);

  if (!parsed) return null;

  if (parsed.kind === "custom" && parsed.id && !imgFailed) {
    const ext = parsed.animated ? "gif" : "png";
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://cdn.discordapp.com/emojis/${parsed.id}.${ext}?size=64`}
        alt={parsed.name ?? "emoji"}
        width={size}
        height={size}
        className="inline-block shrink-0 object-contain"
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (parsed.kind === "invalid") {
    return (
      <span
        title={`Ungültiges Format: ${parsed.text}. Erwartet wird ein Unicode-Emoji oder <:name:id>.`}
        className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 text-[10px] font-medium text-rose-300"
      >
        ⚠ {parsed.text}
      </span>
    );
  }

  return (
    <span
      style={{ fontSize: size }}
      className="inline-block leading-none"
    >
      {parsed.text}
    </span>
  );
}
