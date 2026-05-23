"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { MessagePreview } from "@/components/MessagePreview";
import type { RoleOpt } from "./FeedManager";
import { createFeed, updateFeed, testUrl, type TestPreview } from "./actions";
import { RssEmbedBody } from "./RssEmbedBody";

interface Props {
  channels: ChannelOption[];
  roles: RoleOpt[];
  bot: { name: string; avatarUrl: string | null };
  initial?: {
    id: number;
    name: string;
    url: string;
    channelId: string;
    pingRoleId: string | null;
    intervalMin: number;
    maxPostsPerRun: number;
    enabled: boolean;
  };
  onDone: () => void;
}

function intToHex(color: number, fallback = "#a1a1aa"): string {
  if (!color) return fallback;
  return "#" + color.toString(16).padStart(6, "0");
}

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60, 120, 240];

export function FeedForm({ channels, roles, bot, initial, onDone }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [channelId, setChannelId] = useState(initial?.channelId ?? "");
  const [pingRoleId, setPingRoleId] = useState(initial?.pingRoleId ?? "");
  const [intervalMin, setIntervalMin] = useState(initial?.intervalMin ?? 15);
  const [maxPosts, setMaxPosts] = useState(initial?.maxPostsPerRun ?? 5);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [roleOpen, setRoleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TestPreview | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isTesting, startTest] = useTransition();
  const lastTestedUrl = useRef<string>("");

  // Initiale URL beim Edit direkt prüfen, damit Vorschau sofort da ist.
  useEffect(() => {
    if (!initial?.url) return;
    startTest(async () => {
      const res = await testUrl(initial.url);
      if (res.ok) {
        setPreview(res.preview);
        lastTestedUrl.current = initial.url;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRole = roles.find((r) => r.roleId === pingRoleId);

  // Auto-Test: 800ms nach letzter URL-Änderung den Feed prüfen.
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || trimmed === lastTestedUrl.current) return;
    try {
      new URL(trimmed);
    } catch {
      return;
    }
    const handle = setTimeout(() => {
      lastTestedUrl.current = trimmed;
      setTestError(null);
      startTest(async () => {
        const res = await testUrl(trimmed);
        if (res.ok) {
          setPreview(res.preview);
          if (!name.trim() && res.preview.title) {
            setName(res.preview.title.slice(0, 80));
          }
        } else {
          setPreview(null);
          setTestError(res.error);
        }
      });
    }, 800);
    return () => clearTimeout(handle);
    // name & startTest absichtlich nicht in deps — sonst flackert es.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    startSave(async () => {
      const res = initial ? await updateFeed(initial.id, fd) : await createFeed(fd);
      if (res.ok) {
        onDone();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Feed-URL</span>
        <div className="relative">
          <input
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            placeholder="https://example.com/rss.xml"
            className="input w-full pr-24"
            required
          />
          {isTesting && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-subtle">
              Prüfe…
            </span>
          )}
          {!isTesting && preview && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400">
              ✓ {preview.itemCount} Einträge
            </span>
          )}
        </div>
        {testError && <p className="mt-1.5 text-xs text-rose-400">⚠ {testError}</p>}
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Name</span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="z. B. Heise News"
          className="input w-full"
          required
        />
        <p className="mt-1.5 text-xs text-ink-subtle">
          Wird im Embed als Autor angezeigt.
        </p>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Ziel-Channel</span>
        <ChannelPicker
          name="channelId"
          defaultValue={initial?.channelId}
          value={channelId}
          channels={channels}
          allowedTypes={[0, 5]}
          onChange={(v) => setChannelId(v)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">Poll-Intervall</span>
          <select
            name="intervalMin"
            value={intervalMin}
            onChange={(e) => setIntervalMin(Number(e.target.value))}
            className="input w-full"
          >
            {INTERVAL_OPTIONS.map((min) => (
              <option key={min} value={min}>
                {min < 60 ? `${min} Min` : `${min / 60} h`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Max. neue Posts pro Lauf
          </span>
          <input
            type="number"
            name="maxPostsPerRun"
            value={maxPosts}
            onChange={(e) => setMaxPosts(Number(e.target.value))}
            min={1}
            max={50}
            className="input w-full"
          />
          <p className="mt-1.5 text-xs text-ink-subtle">
            Spam-Schutz: bei vielen neuen Artikeln auf einmal werden nur so viele
            gepostet, der Rest stumm als „gesehen" markiert.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-line bg-bg-elevated text-brand focus:ring-brand"
        />
        Feed aktiv
      </label>

      <div className="relative">
        <span className="mb-1.5 block text-sm font-medium text-ink">Ping-Rolle (optional)</span>
        <input type="hidden" name="pingRoleId" value={pingRoleId} />
        <button
          type="button"
          onClick={() => setRoleOpen(!roleOpen)}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-bg-elevated px-4 py-2.5 text-sm text-ink shadow-inner transition-colors hover:border-line-strong"
        >
          {selectedRole ? (
            <span
              className="inline-flex items-center gap-2"
              style={{ color: intToHex(selectedRole.color) }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: intToHex(selectedRole.color) }}
              />
              @{selectedRole.name}
            </span>
          ) : (
            <span className="text-ink-subtle">— keine Rolle pingen —</span>
          )}
          <svg
            className="h-3.5 w-3.5 text-ink-subtle"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {roleOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-line bg-bg-elevated p-1 shadow-card-lg">
            <button
              type="button"
              onClick={() => {
                setPingRoleId("");
                setRoleOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-subtle hover:bg-bg-hover"
            >
              — keine Rolle —
            </button>
            {roles.map((r) => {
              const c = intToHex(r.color);
              return (
                <button
                  key={r.roleId}
                  type="button"
                  onClick={() => {
                    setPingRoleId(r.roleId);
                    setRoleOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-bg-hover"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                  <span className="truncate" style={{ color: c }}>
                    @{r.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2">
        <MessagePreview
          text={pingRoleId ? "<@&123>" : ""}
          botName={bot.name}
          botAvatarUrl={bot.avatarUrl}
          label="So sieht ein Post im Discord aus"
          emptyText={null}
          embed={
            preview?.sample ? (
              <RssEmbedBody
                data={{
                  feedName: name.trim() || preview.title || "RSS-Feed",
                  feedLink: preview.link,
                  itemTitle: preview.sample.title,
                  itemLink: preview.sample.link,
                  itemDescription: preview.sample.description,
                  itemImageUrl: preview.sample.imageUrl,
                  itemAuthor: preview.sample.author,
                  itemPubDate: preview.sample.pubDate,
                }}
              />
            ) : (
              <div className="rounded border border-dashed border-line bg-bg-elevated/30 px-3 py-4 text-xs italic text-ink-subtle">
                {isTesting
                  ? "Feed wird geladen…"
                  : url.trim()
                    ? "Konnte keinen Beispiel-Artikel laden — bitte URL prüfen."
                    : "URL eingeben — die Vorschau erscheint automatisch."}
              </div>
            )
          }
          hint={
            preview?.sample
              ? "Echte Daten aus dem neuesten Artikel deines Feeds."
              : undefined
          }
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className="btn-secondary">
          Abbrechen
        </button>
        <button type="submit" disabled={isSaving} className="btn-primary disabled:opacity-60">
          {isSaving ? "Speichere…" : initial ? "Speichern" : "Feed anlegen"}
        </button>
      </div>
    </form>
  );
}
