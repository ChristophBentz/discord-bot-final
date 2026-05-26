import { listEmojis } from "./actions";
import { EmojiManager } from "./EmojiManager";
import { FeatureHero } from "@/components/FeatureHero";

export default async function EmojisPage() {
  const emojis = await listEmojis();
  const animated = emojis.filter((e) => e.animated).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Utility</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Emoji-Verwaltung</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Lade beliebige Bilder als Server-Emojis hoch — automatische Verkleinerung auf 128×128
          und Kompression auf das Discord-Limit (256 KB). Mehrfach-Upload, Drag &amp; Drop,
          umbenennen und löschen.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
          </svg>
        }
        title="Custom-Emojis"
        status={
          emojis.length === 0
            ? "Noch keine Custom-Emojis"
            : `${emojis.length} insgesamt${animated > 0 ? ` · ${animated} animiert` : ""}`
        }
        active={emojis.length > 0}
        tone="purple"
        stats={[
          { label: "Statisch", value: emojis.length - animated },
          { label: "Animiert", value: animated },
          { label: "Frei", value: `~${Math.max(0, 50 - emojis.length)}+`, sublabel: "vor Boost" },
        ]}
      />

      <EmojiManager initial={emojis} />
    </div>
  );
}
