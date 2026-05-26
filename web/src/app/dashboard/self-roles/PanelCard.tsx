"use client";

import { useState, useTransition } from "react";
import type { ChannelOption } from "@/components/ChannelPicker";
import {
  addOption,
  deletePanel,
  removeOption,
  syncPanel,
  updatePanel,
} from "./actions";
import type { PanelDTO, RoleOpt } from "./SelfRolesManager";
import { EmojiDisplay, parseEmoji } from "./EmojiDisplay";

const TYPE_LABEL = {
  reaction: "Reactions",
  button: "Buttons",
  dropdown: "Dropdown",
} as const;

const BUTTON_STYLE_NAMES = ["primary", "secondary", "success", "danger"] as const;
const BUTTON_STYLE_LABELS: Record<string, string> = {
  primary: "Blau (Primary)",
  secondary: "Grau (Secondary)",
  success: "Grün (Success)",
  danger: "Rot (Danger)",
};

function intToHex(color: number | null, fallback = "#a855f7"): string {
  if (color === null || color === undefined) return fallback;
  return "#" + color.toString(16).padStart(6, "0");
}

export function PanelCard({
  panel,
  channels,
  roles,
}: {
  panel: PanelDTO;
  channels: ChannelOption[];
  roles: RoleOpt[];
}) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [isSyncing, startSync] = useTransition();
  const [isDeleting, startDel] = useTransition();

  const channelName = channels.find((c) => c.channelId === panel.channelId)?.name ?? "?";
  const accent = intToHex(panel.color);

  const onSync = () => {
    setFeedback(null);
    startSync(async () => {
      const r = await syncPanel(panel.id);
      setFeedback(r.ok ? "Im Discord aktualisiert." : r.error);
    });
  };

  const onDelete = () => {
    startDel(async () => {
      await deletePanel(panel.id);
    });
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-bg-elevated/30 transition-colors ${
        panel.enabled ? "border-line hover:border-line-strong" : "border-line opacity-60"
      }`}
    >
      <div className="flex items-start gap-3 border-l-4 px-5 py-4" style={{ borderLeftColor: accent }}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-ink">{panel.title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                panel.enabled
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-zinc-500/15 text-zinc-400"
              }`}
            >
              {panel.enabled ? "Aktiv" : "Pausiert"}
            </span>
            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
              {TYPE_LABEL[panel.type]}
            </span>
            {panel.uniqueChoice && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Eine Wahl
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span>#{channelName}</span>
            {panel.messageId && (
              <span className="font-mono text-[10px] text-ink-subtle">Msg: {panel.messageId}</span>
            )}
            <span>· {panel.options.length} {panel.options.length === 1 ? "Rolle" : "Rollen"}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onSync} disabled={isSyncing} className="rounded-md px-2.5 py-1 text-xs text-ink-muted hover:bg-bg-hover hover:text-ink">
            {isSyncing ? "Sync…" : "Im Discord aktualisieren"}
          </button>
          <button type="button" onClick={() => setEditing(true)} className="rounded-md px-2.5 py-1 text-xs text-ink-muted hover:bg-bg-hover hover:text-ink">
            Bearbeiten
          </button>
          {confirmDel ? (
            <button type="button" onClick={onDelete} disabled={isDeleting} className="rounded-md border border-rose-500/50 bg-rose-500/15 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/25">
              {isDeleting ? "…" : "Wirklich?"}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDel(true)} className="rounded-md px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10">
              Löschen
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="mx-5 mt-2 rounded-md border border-line bg-bg-card px-3 py-1.5 text-xs text-ink-muted">
          {feedback}
        </div>
      )}

      {/* Options-Liste */}
      <div className="space-y-2 px-5 pb-5 pt-3">
        {panel.options.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
            Noch keine Rollen — klick „+ Rolle hinzufügen" unten.
          </div>
        ) : (
          panel.options.map((opt) => {
            const role = roles.find((r) => r.roleId === opt.roleId);
            const color = role ? intToHex(role.color) : "#a1a1aa";
            return (
              <div
                key={opt.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-bg-elevated/40 px-3 py-2"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-bg-card">
                  {opt.emoji ? (
                    <EmojiDisplay raw={opt.emoji} size={20} />
                  ) : (
                    <span className="text-ink-subtle">•</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="truncate font-medium text-ink">{opt.label}</span>
                    <span
                      className="inline-flex items-center gap-1 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px]"
                      style={{ color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                      @{role?.name ?? opt.roleId}
                    </span>
                    {panel.type === "button" && opt.buttonStyle && (
                      <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-ink-subtle">
                        {opt.buttonStyle}
                      </span>
                    )}
                  </div>
                  {opt.description && (
                    <div className="mt-0.5 truncate text-xs text-ink-muted">{opt.description}</div>
                  )}
                </div>
                <RemoveButton panelId={panel.id} optionId={opt.id} />
              </div>
            );
          })
        )}

        {adding ? (
          <AddOptionForm
            panelId={panel.id}
            type={panel.type}
            roles={roles}
            existing={panel.options.map((o) => o.roleId)}
            onDone={() => setAdding(false)}
          />
        ) : panel.options.length < 25 ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-xl border border-dashed border-line bg-bg-elevated/30 px-3 py-2 text-sm text-ink-muted hover:border-brand/40 hover:bg-bg-hover hover:text-ink"
          >
            + Rolle hinzufügen
          </button>
        ) : (
          <p className="text-xs text-ink-subtle">Max. 25 Rollen pro Panel.</p>
        )}
      </div>

      {editing && (
        <EditPanelOverlay
          panel={panel}
          channels={channels}
          onDone={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function RemoveButton({ panelId, optionId }: { panelId: number; optionId: number }) {
  const [isPending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(async () => { await removeOption(panelId, optionId); })}
      disabled={isPending}
      title="Entfernen"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-rose-500/15 hover:text-rose-400"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

function AddOptionForm({
  panelId,
  type,
  roles,
  existing,
  onDone,
}: {
  panelId: number;
  type: "reaction" | "button" | "dropdown";
  roles: RoleOpt[];
  existing: string[];
  onDone: () => void;
}) {
  const [roleId, setRoleId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [buttonStyle, setButtonStyle] = useState("secondary");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, start] = useTransition();

  const available = roles.filter((r) => !existing.includes(r.roleId));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await addOption(panelId, fd);
      if (r.ok) onDone();
      else setError(r.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-brand/40 bg-brand/5 p-3 space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
            Rolle
          </label>
          <select
            name="roleId"
            value={roleId}
            onChange={(e) => {
              setRoleId(e.target.value);
              if (!label) {
                const role = roles.find((r) => r.roleId === e.target.value);
                if (role) setLabel(role.name);
              }
            }}
            required
            className="input"
          >
            <option value="">— Rolle wählen —</option>
            {available.map((r) => (
              <option key={r.roleId} value={r.roleId}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
            Label / sichtbarer Name
          </label>
          <input
            name="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
            Emoji {type === "reaction" ? "(erforderlich)" : "(optional)"}
          </label>
          <div className="flex items-stretch gap-2">
            <input
              name="emoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🎮 oder <:name:123…>"
              required={type === "reaction"}
              className="input flex-1"
            />
            {emoji && (
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-bg-card">
                <EmojiDisplay raw={emoji} size={20} />
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-ink-subtle">
            Unicode wie 🎮 direkt einfügen, oder für Custom-Emoji im Discord{" "}
            <code className="rounded bg-bg-elevated px-1 font-mono">\:name:</code> tippen (Backslash davor) →
            das ausgegebene <code className="rounded bg-bg-elevated px-1 font-mono">{"<:name:id>"}</code> hier reinkopieren.
          </p>
          {emoji && parseEmoji(emoji)?.kind === "invalid" && (
            <p className="mt-1 text-[10px] text-rose-400">
              ⚠ Discord-Shortcode (z.B. <code>:name:</code>) funktioniert nicht via API. Brauchst die volle Form.
            </p>
          )}
        </div>
        {type === "button" && (
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
              Button-Stil
            </label>
            <select
              name="buttonStyle"
              value={buttonStyle}
              onChange={(e) => setButtonStyle(e.target.value)}
              className="input"
            >
              {BUTTON_STYLE_NAMES.map((s) => (
                <option key={s} value={s}>
                  {BUTTON_STYLE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        )}
        {type === "dropdown" && (
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
              Beschreibung (im Dropdown sichtbar)
            </label>
            <input
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              placeholder="z.B. Bekomme Benachrichtigungen"
              className="input"
            />
          </div>
        )}
      </div>
      {type !== "dropdown" && (
        <input type="hidden" name="description" value={description} />
      )}
      {type !== "button" && <input type="hidden" name="buttonStyle" value="secondary" />}

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="text-xs text-ink-muted hover:text-ink">
          Abbrechen
        </button>
        <button type="submit" disabled={isAdding || !roleId || !label.trim()} className="btn-primary text-sm disabled:opacity-60">
          {isAdding ? "Lege an…" : "Hinzufügen"}
        </button>
      </div>
    </form>
  );
}

function EditPanelOverlay({
  panel,
  channels,
  onDone,
}: {
  panel: PanelDTO;
  channels: ChannelOption[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState(panel.title);
  const [description, setDescription] = useState(panel.description ?? "");
  const [color, setColor] = useState(intToHex(panel.color));
  const [channelId, setChannelId] = useState(panel.channelId);
  const [uniqueChoice, setUniqueChoice] = useState(panel.uniqueChoice);
  const [useEmbed, setUseEmbed] = useState(panel.useEmbed);
  const [enabled, setEnabled] = useState(panel.enabled);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, start] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("type", panel.type);
    start(async () => {
      const r = await updatePanel(panel.id, fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      await syncPanel(panel.id);
      onDone();
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 p-4 pt-[8vh] backdrop-blur-sm" onClick={onDone}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl space-y-4 rounded-2xl border border-line bg-bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Panel bearbeiten</h3>
          <button type="button" onClick={onDone} className="text-xs text-ink-muted hover:text-ink">
            Abbrechen
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Channel</label>
          <ChannelPickerImported
            name="channelId"
            value={channelId}
            channels={channels}
            onChange={setChannelId}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Titel</label>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={256}
            required
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Beschreibung</label>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={2000}
            className="input resize-y"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Farbe</label>
            <div className="flex items-center gap-2">
              <input
                name="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-bg-elevated"
              />
              <input value={color} onChange={(e) => setColor(e.target.value)} className="input flex-1 font-mono text-sm" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-bg-elevated/40 px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="useEmbed"
                checked={useEmbed}
                onChange={(e) => setUseEmbed(e.target.checked)}
                className="h-4 w-4"
              />
              Als Embed-Box posten
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-bg-elevated/40 px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="uniqueChoice"
                checked={uniqueChoice}
                onChange={(e) => setUniqueChoice(e.target.checked)}
                className="h-4 w-4"
              />
              Eine Rolle gleichzeitig
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-bg-elevated/40 px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              Panel aktiv
            </label>
          </div>
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
          <button type="submit" disabled={isSaving} className="btn-primary disabled:opacity-60">
            {isSaving ? "Speichere…" : "Speichern + Sync"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Re-export für lokalen Use
import { ChannelPicker as ChannelPickerImported } from "@/components/ChannelPicker";
