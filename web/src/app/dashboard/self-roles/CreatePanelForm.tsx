"use client";

import { useState, useTransition } from "react";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { createPanel, syncPanel, type PanelType } from "./actions";

const TYPE_INFO: { value: PanelType; label: string; desc: string }[] = [
  {
    value: "reaction",
    label: "Reactions",
    desc: "User reagiert mit Emoji → bekommt Rolle. Klassisches Discord-Feature.",
  },
  {
    value: "button",
    label: "Buttons",
    desc: "User klickt Button → bekommt Rolle. Bis zu 25 Rollen pro Panel.",
  },
  {
    value: "dropdown",
    label: "Dropdown",
    desc: "User wählt aus Dropdown-Menü. Optional Mehrfach-Auswahl.",
  },
];

export function CreatePanelForm({
  channels,
  onDone,
}: {
  channels: ChannelOption[];
  onDone: () => void;
}) {
  const [channelId, setChannelId] = useState("");
  const [type, setType] = useState<PanelType>("button");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#a855f7");
  const [uniqueChoice, setUniqueChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("enabled", "on");
    startCreate(async () => {
      const r = await createPanel(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.id) await syncPanel(r.id);
      onDone();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-brand/40 bg-brand/5 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Neues Panel anlegen</h3>
        <button type="button" onClick={onDone} className="text-xs text-ink-muted hover:text-ink">
          Abbrechen
        </button>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-ink">Typ</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPE_INFO.map((t) => (
            <label
              key={t.value}
              className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                type === t.value
                  ? "border-brand/40 bg-brand/[0.08]"
                  : "border-line bg-bg-elevated/40 hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="sr-only"
              />
              <div className="text-sm font-semibold text-ink">{t.label}</div>
              <div className="mt-0.5 text-[11px] text-ink-muted">{t.desc}</div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Channel</span>
        <ChannelPicker
          name="channelId"
          value={channelId}
          channels={channels}
          allowedTypes={[0, 5]}
          onChange={setChannelId}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="sp-title">
          Titel
        </label>
        <input
          id="sp-title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. „Wähle deine Pronomen"
          maxLength={256}
          className="input"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="sp-desc">
          Beschreibung (optional)
        </label>
        <textarea
          id="sp-desc"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Erklär kurz wofür das Panel ist."
          className="input resize-y"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="sp-color">
            Embed-Farbe
          </label>
          <div className="flex items-center gap-2">
            <input
              id="sp-color"
              name="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-bg-elevated"
            />
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="input flex-1 font-mono text-sm"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line bg-bg-elevated/40 p-3">
          <input
            type="checkbox"
            name="uniqueChoice"
            checked={uniqueChoice}
            onChange={(e) => setUniqueChoice(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line bg-bg-elevated text-brand focus:ring-brand"
          />
          <div>
            <div className="text-sm font-medium text-ink">Nur eine Rolle gleichzeitig</div>
            <div className="mt-0.5 text-[11px] text-ink-muted">
              User kann nur EINE Rolle aus diesem Panel haben — alte wird beim Neu-Wählen entfernt.
            </div>
          </div>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn-secondary">
          Abbrechen
        </button>
        <button type="submit" disabled={isCreating || !channelId || !title.trim()} className="btn-primary disabled:opacity-60">
          {isCreating ? "Erstelle…" : "Panel anlegen + posten"}
        </button>
      </div>
    </form>
  );
}
