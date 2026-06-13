"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { createGiveaway, endGiveaway, rerollGiveaway, deleteGiveaway } from "./actions";

interface RoleOption {
  roleId: string;
  name: string;
  color: number;
}

export interface GiveawayRow {
  id: number;
  channelId: string;
  channelName: string | null;
  prize: string;
  description: string | null;
  rewardCode: string | null;
  winnerCount: number;
  minLevel: number | null;
  requiredRoleName: string | null;
  minMemberDays: number | null;
  endsAt: string;
  ended: boolean;
  entryCount: number;
  winners: { userId: string; name: string }[];
}

interface Props {
  channels: ChannelOption[];
  roles: RoleOption[];
  giveaways: GiveawayRow[];
}

// Werte in Sekunden.
const DURATIONS = [
  { label: "30 Sekunden (Test)", value: 30 },
  { label: "5 Minuten", value: 300 },
  { label: "30 Minuten", value: 1800 },
  { label: "1 Stunde", value: 3600 },
  { label: "6 Stunden", value: 21600 },
  { label: "12 Stunden", value: 43200 },
  { label: "1 Tag", value: 86400 },
  { label: "3 Tage", value: 259200 },
  { label: "1 Woche", value: 604800 },
];

export function GiveawayManager({ channels, roles, giveaways }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Formular-State
  const [channelId, setChannelId] = useState("");
  const [prize, setPrize] = useState("");
  const [description, setDescription] = useState("");
  const [rewardCode, setRewardCode] = useState("");
  const [winnerCount, setWinnerCount] = useState(1);
  const [duration, setDuration] = useState(86400);
  const [minLevel, setMinLevel] = useState("");
  const [requiredRoleId, setRequiredRoleId] = useState("");
  const [minMemberDays, setMinMemberDays] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!channelId) return setFeedback({ kind: "error", msg: "Bitte einen Channel wählen." });
    if (!prize.trim()) return setFeedback({ kind: "error", msg: "Preis darf nicht leer sein." });
    startTransition(async () => {
      const res = await createGiveaway({
        channelId,
        prize: prize.trim(),
        description: description.trim() || undefined,
        rewardCode: rewardCode.trim() || undefined,
        winnerCount,
        durationSeconds: duration,
        minLevel: minLevel ? Math.max(1, parseInt(minLevel)) : null,
        requiredRoleId: requiredRoleId || null,
        minMemberDays: minMemberDays ? Math.max(1, parseInt(minMemberDays)) : null,
      });
      if (res.ok) {
        setFeedback({ kind: "ok", msg: "Giveaway gestartet!" });
        setPrize("");
        setDescription("");
        setRewardCode("");
        setMinLevel("");
        setRequiredRoleId("");
        setMinMemberDays("");
        setWinnerCount(1);
        router.refresh();
      } else {
        setFeedback({ kind: "error", msg: res.error });
      }
    });
  };

  const runAction = (id: number, fn: (id: number) => Promise<{ ok: boolean; error?: string }>, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusyId(id);
    startTransition(async () => {
      const res = await fn(id);
      if (!res.ok) setFeedback({ kind: "error", msg: res.error ?? "Fehler" });
      setBusyId(null);
      router.refresh();
    });
  };

  const active = giveaways.filter((g) => !g.ended);
  const ended = giveaways.filter((g) => g.ended);

  return (
    <div className="space-y-8">
      {/* Erstellen */}
      <form onSubmit={submit} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold">Neues Giveaway</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Preis</label>
            <input
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              maxLength={200}
              placeholder="z.B. Nitro für 1 Monat"
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Channel</label>
            <ChannelPicker
              value={channelId}
              onChange={(v) => setChannelId(v ?? "")}
              channels={channels}
              allowedTypes={[0, 5]}
              placeholder="— Channel wählen —"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Beschreibung (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Details zum Gewinn, Regeln, …"
            className="input min-h-[60px] w-full resize-y"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Gewinn-Code (optional)
          </label>
          <input
            value={rewardCode}
            onChange={(e) => setRewardCode(e.target.value)}
            maxLength={500}
            placeholder="z.B. ein Key oder Gutscheincode"
            className="input font-mono"
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Wird dem Gewinner privat per DM zugeschickt (nie öffentlich im Channel). Hier im
            Dashboard bleibt er sichtbar, falls du ihn manuell weitergeben musst.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Anzahl Gewinner</label>
            <input
              type="number"
              min={1}
              max={50}
              value={winnerCount}
              onChange={(e) => setWinnerCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Laufzeit</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input">
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kriterien */}
        <div className="rounded-xl border border-line bg-bg-elevated/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Teilnahme-Bedingungen (optional)
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">Mindest-Level</label>
              <input
                type="number"
                min={1}
                value={minLevel}
                onChange={(e) => setMinLevel(e.target.value)}
                placeholder="z.B. 5"
                className="input !py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">Benötigte Rolle</label>
              <select
                value={requiredRoleId}
                onChange={(e) => setRequiredRoleId(e.target.value)}
                className="input !py-2 text-sm"
              >
                <option value="">— keine —</option>
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">Min. Tage im Server</label>
              <input
                type="number"
                min={1}
                value={minMemberDays}
                onChange={(e) => setMinMemberDays(e.target.value)}
                placeholder="z.B. 7"
                className="input !py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {feedback && (
            <span className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
              {feedback.msg}
            </span>
          )}
          <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
            {isPending ? "Startet…" : "Giveaway starten"}
          </button>
        </div>
      </form>

      {/* Aktive */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Laufende Giveaways</h2>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
            Aktuell läuft kein Giveaway.
          </div>
        ) : (
          <ul className="space-y-2">
            {active.map((g) => (
              <GiveawayCard
                key={g.id}
                g={g}
                busy={busyId === g.id && isPending}
                onEnd={() => runAction(g.id, endGiveaway, `Giveaway „${g.prize}" jetzt beenden und Gewinner ziehen?`)}
                onDelete={() => runAction(g.id, deleteGiveaway, `Giveaway „${g.prize}" löschen? Die Nachricht wird entfernt.`)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Beendete */}
      {ended.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Beendete Giveaways</h2>
          <ul className="space-y-2">
            {ended.map((g) => (
              <GiveawayCard
                key={g.id}
                g={g}
                busy={busyId === g.id && isPending}
                onReroll={() => runAction(g.id, rerollGiveaway, `Neue Gewinner für „${g.prize}" auslosen?`)}
                onDelete={() => runAction(g.id, deleteGiveaway, `Giveaway „${g.prize}" löschen?`)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GiveawayCard({
  g,
  busy,
  onEnd,
  onReroll,
  onDelete,
}: {
  g: GiveawayRow;
  busy: boolean;
  onEnd?: () => void;
  onReroll?: () => void;
  onDelete?: () => void;
}) {
  const criteria: string[] = [];
  if (g.minLevel) criteria.push(`Level ${g.minLevel}+`);
  if (g.requiredRoleName) criteria.push(`@${g.requiredRoleName}`);
  if (g.minMemberDays) criteria.push(`${g.minMemberDays}+ Tage`);

  return (
    <li className={`card p-4 ${busy ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">🎉 {g.prize}</span>
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[11px] text-ink-subtle">
              #{g.channelName ?? g.channelId}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span>{g.entryCount} Teilnehmer</span>
            <span>·</span>
            <span>{g.winnerCount} Gewinner</span>
            {!g.ended && (
              <>
                <span>·</span>
                <span>endet {new Date(g.endsAt).toLocaleString("de-DE")}</span>
              </>
            )}
            {criteria.length > 0 && (
              <>
                <span>·</span>
                <span>{criteria.join(", ")}</span>
              </>
            )}
          </div>
          {g.ended && g.winners.length > 0 && (
            <div className="mt-1.5 text-xs">
              <span className="text-ink-subtle">Gewinner: </span>
              <span className="font-medium text-ink">{g.winners.map((w) => w.name).join(", ")}</span>
            </div>
          )}
          {g.rewardCode && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-bg-elevated px-2 py-1 text-xs">
              <span className="text-ink-subtle">Code:</span>
              <code className="font-mono text-ink">{g.rewardCode}</code>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onEnd && (
            <button type="button" onClick={onEnd} disabled={busy} className="btn-secondary !px-3 !py-1.5 text-xs">
              Jetzt beenden
            </button>
          )}
          {onReroll && (
            <button type="button" onClick={onReroll} disabled={busy} className="btn-secondary !px-3 !py-1.5 text-xs">
              Neu auslosen
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              title="Löschen"
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-subtle hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
