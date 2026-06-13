"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { MessagePreview } from "@/components/MessagePreview";
import {
  createGiveaway,
  endGiveaway,
  rerollGiveaway,
  rerollWinner,
  deleteGiveaway,
} from "./actions";

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
  bonusRoles: { roleName: string; extra: number }[];
  endsAt: string;
  ended: boolean;
  entryCount: number;
  totalTickets: number;
  winners: { userId: string; name: string; dmStatus: string | null; code: string | null }[];
}

interface Props {
  channels: ChannelOption[];
  roles: RoleOption[];
  giveaways: GiveawayRow[];
  bot: { name: string; avatarUrl: string | null };
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

export function GiveawayManager({ channels, roles, giveaways, bot }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Formular-State
  const [channelId, setChannelId] = useState("");
  const [prize, setPrize] = useState("");
  const [description, setDescription] = useState("");
  const [rewardCode, setRewardCode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [winnerCount, setWinnerCount] = useState(1);
  const [duration, setDuration] = useState(86400);
  const [minLevel, setMinLevel] = useState("");
  const [requiredRoleId, setRequiredRoleId] = useState("");
  const [minMemberDays, setMinMemberDays] = useState("");
  const [bonusRoles, setBonusRoles] = useState<{ roleId: string; extra: number }[]>([]);

  const onImageFile = (file: File | null) => {
    if (!file) return setImageFile(null);
    if (!file.type.startsWith("image/")) {
      setFeedback({ kind: "error", msg: "Nur Bilddateien erlaubt." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ kind: "error", msg: "Bild größer als 8 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageFile({ name: file.name, dataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const addBonusRole = () => setBonusRoles((p) => [...p, { roleId: "", extra: 1 }]);
  const updateBonusRole = (i: number, patch: Partial<{ roleId: string; extra: number }>) =>
    setBonusRoles((p) => p.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const removeBonusRole = (i: number) => setBonusRoles((p) => p.filter((_, idx) => idx !== i));

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
        imageUrl: !imageFile && imageUrl.trim() ? imageUrl.trim() : undefined,
        imageBase64: imageFile ? imageFile.dataUrl.split(",")[1] : undefined,
        imageFileName: imageFile?.name,
        winnerCount,
        durationSeconds: duration,
        minLevel: minLevel ? Math.max(1, parseInt(minLevel)) : null,
        requiredRoleId: requiredRoleId || null,
        minMemberDays: minMemberDays ? Math.max(1, parseInt(minMemberDays)) : null,
        bonusRoles: bonusRoles.filter((b) => b.roleId && b.extra > 0),
      });
      if (res.ok) {
        setFeedback({ kind: "ok", msg: "Giveaway gestartet!" });
        setPrize("");
        setDescription("");
        setRewardCode("");
        setImageUrl("");
        setImageFile(null);
        setMinLevel("");
        setRequiredRoleId("");
        setMinMemberDays("");
        setBonusRoles([]);
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
            Bild (optional)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-bg-elevated/60 px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-brand/40 hover:text-ink">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
              Bild hochladen
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  onImageFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="text-xs text-ink-subtle">oder</span>
            <input
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (e.target.value) setImageFile(null);
              }}
              disabled={!!imageFile}
              placeholder="Bild-URL (https://…)"
              className="input flex-1 disabled:opacity-50"
            />
          </div>
          {(imageFile || imageUrl.trim()) && (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageFile?.dataUrl ?? imageUrl}
                alt=""
                className="max-h-32 rounded-lg border border-line object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImageUrl("");
                }}
                className="text-xs text-ink-subtle hover:text-rose-400"
              >
                Entfernen
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Gewinn-Code(s) (optional)
          </label>
          <textarea
            value={rewardCode}
            onChange={(e) => setRewardCode(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={"Ein Code pro Zeile — bei mehreren Gewinnern bekommt jeder einen eigenen."}
            className="input min-h-[56px] w-full resize-y font-mono text-xs"
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Wird dem Gewinner privat per DM zugeschickt (nie öffentlich im Channel). Bei mehreren
            Gewinnern: <strong>ein Code pro Zeile</strong>, jeder bekommt einen anderen. Im
            Dashboard bleiben die Codes für dich sichtbar.
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

        {/* Bonus-Lose nach Rolle — Transparenz */}
        <div className="rounded-xl border border-line bg-bg-elevated/40 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Bonus-Lose nach Rolle (optional)
            </div>
            <button
              type="button"
              onClick={addBonusRole}
              className="rounded-md border border-line bg-bg-elevated/60 px-2 py-0.5 text-xs text-ink-muted hover:border-brand/40 hover:text-ink"
            >
              + Rolle
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-subtle">
            Standard: jeder hat <strong>1 Los</strong>. Hier kannst du Rollen extra Lose geben
            (z.B. Booster) — das erhöht ihre Gewinnchance. Wird im Giveaway transparent angezeigt.
          </p>
          {bonusRoles.length > 0 && (
            <div className="mt-3 space-y-2">
              {bonusRoles.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={b.roleId}
                    onChange={(e) => updateBonusRole(i, { roleId: e.target.value })}
                    className="input !py-2 flex-1 text-sm"
                  >
                    <option value="">— Rolle wählen —</option>
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        @{r.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 text-sm text-ink-muted">
                    +
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={b.extra}
                      onChange={(e) => updateBonusRole(i, { extra: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="input !w-16 !py-2 text-sm"
                    />
                    Lose
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBonusRole(i)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-subtle hover:bg-rose-500/15 hover:text-rose-400"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live-Vorschau wie im Discord */}
        <MessagePreview
          text=""
          botName={bot.name}
          botAvatarUrl={bot.avatarUrl}
          emptyText={null}
          embed={
            <GiveawayPreviewBody
              prize={prize}
              description={description}
              imageSrc={imageFile?.dataUrl ?? (imageUrl.trim() || null)}
              winnerCount={winnerCount}
              durationLabel={DURATIONS.find((d) => d.value === duration)?.label ?? `${duration}s`}
              criteria={[
                minLevel ? `Mindestens Level ${minLevel}` : "",
                requiredRoleId ? `Rolle @${roles.find((r) => r.roleId === requiredRoleId)?.name ?? "?"} erforderlich` : "",
                minMemberDays ? `Seit mind. ${minMemberDays} Tagen dabei` : "",
              ].filter(Boolean)}
              bonus={bonusRoles
                .filter((b) => b.roleId && b.extra > 0)
                .map((b) => ({ name: roles.find((r) => r.roleId === b.roleId)?.name ?? "?", extra: b.extra }))}
            />
          }
        />

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
                onReroll={() => runAction(g.id, rerollGiveaway, `ALLE Gewinner für „${g.prize}" neu auslosen?`)}
                onRerollWinner={(uid) =>
                  runAction(g.id, (id) => rerollWinner(id, uid), `Diesen Gewinner ersetzen (neuen aus dem Pool ziehen)?`)
                }
                onDelete={() => runAction(g.id, deleteGiveaway, `Giveaway „${g.prize}" löschen?`)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Discord-Embed-Nachbildung für die Vorschau im Formular.
function GiveawayPreviewBody({
  prize,
  description,
  imageSrc,
  winnerCount,
  durationLabel,
  criteria,
  bonus,
}: {
  prize: string;
  description: string;
  imageSrc: string | null;
  winnerCount: number;
  durationLabel: string;
  criteria: string[];
  bonus: { name: string; extra: number }[];
}) {
  return (
    <div className="max-w-[440px] rounded border-l-[3px] border-brand bg-bg-elevated/60 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand">🎉 GIVEAWAY</div>
      <div className="mt-1 text-base font-bold text-ink">{prize || "— Preis —"}</div>
      {description && (
        <div className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-muted">{description}</div>
      )}
      <div className="mt-2 text-sm text-ink-muted">Klick auf <strong>🎉 Teilnehmen</strong>, um mitzumachen!</div>
      <div className="mt-2 space-y-0.5 text-xs text-ink-muted">
        <div>
          <span className="font-semibold text-ink">Endet:</span> in {durationLabel}
        </div>
        <div>
          <span className="font-semibold text-ink">Gewinner:</span> {winnerCount} &nbsp;•&nbsp;{" "}
          <span className="font-semibold text-ink">Teilnehmer:</span> 0
        </div>
      </div>
      {criteria.length > 0 && (
        <div className="mt-2 text-xs text-ink-muted">
          <div className="font-semibold text-ink">Bedingungen</div>
          {criteria.map((c, i) => (
            <div key={i}>🔹 {c}</div>
          ))}
        </div>
      )}
      <div className="mt-2 rounded bg-bg-card/60 p-2 text-xs text-ink-muted">
        <div className="font-semibold text-ink">🎲 So wird ausgelost</div>
        {bonus.length > 0 ? (
          <>
            <div>Gewichtete Verlosung — jeder hat 1 Los, bestimmte Rollen mehr:</div>
            {bonus.map((b, i) => (
              <div key={i}>🎟️ @{b.name} · +{b.extra}</div>
            ))}
          </>
        ) : (
          <div>Faire Zufallsziehung — jeder Teilnehmer hat genau 1 Los, gleiche Chance.</div>
        )}
      </div>
      {imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt="" className="mt-2 max-h-56 w-full rounded border border-line object-cover" />
      )}
      <div className="mt-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white">
          🎉 Teilnehmen
        </span>
      </div>
    </div>
  );
}

const DM_BADGE: Record<string, { label: string; cls: string }> = {
  sent: { label: "DM ✓", cls: "bg-emerald-500/15 text-emerald-400" },
  failed: { label: "DM fehlgeschlagen", cls: "bg-rose-500/15 text-rose-400" },
  disabled: { label: "keine DM gewünscht", cls: "bg-bg-elevated text-ink-subtle" },
};

function GiveawayCard({
  g,
  busy,
  onEnd,
  onReroll,
  onRerollWinner,
  onDelete,
}: {
  g: GiveawayRow;
  busy: boolean;
  onEnd?: () => void;
  onReroll?: () => void;
  onRerollWinner?: (userId: string) => void;
  onDelete?: () => void;
}) {
  const criteria: string[] = [];
  if (g.minLevel) criteria.push(`Level ${g.minLevel}+`);
  if (g.requiredRoleName) criteria.push(`@${g.requiredRoleName}`);
  if (g.minMemberDays) criteria.push(`${g.minMemberDays}+ Tage`);

  return (
    <li className={`card p-4 ${busy ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">🎉 {g.prize}</span>
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[11px] text-ink-subtle">
              #{g.channelName ?? g.channelId}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span>{g.entryCount} Teilnehmer</span>
            <span>·</span>
            <span>{g.totalTickets} Lose</span>
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

          {/* Bonus-Lose transparent */}
          {g.bonusRoles.length > 0 && (
            <div className="mt-1.5 text-xs text-ink-subtle">
              Bonus-Lose: {g.bonusRoles.map((b) => `@${b.roleName} +${b.extra}`).join(", ")}
            </div>
          )}

          {/* Gewinner mit DM-Status, Code und Einzel-Reroll */}
          {g.ended && g.winners.length > 0 && (
            <ul className="mt-2 space-y-1">
              {g.winners.map((w) => {
                const badge = w.dmStatus ? DM_BADGE[w.dmStatus] : null;
                return (
                  <li
                    key={w.userId}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-bg-elevated/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-ink">🏆 {w.name}</span>
                    {badge && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                    {w.code && (
                      <span className="inline-flex items-center gap-1 rounded bg-bg-card px-1.5 py-0.5">
                        <span className="text-ink-subtle">Code:</span>
                        <code className="font-mono text-ink">{w.code}</code>
                      </span>
                    )}
                    {onRerollWinner && (
                      <button
                        type="button"
                        onClick={() => onRerollWinner(w.userId)}
                        disabled={busy}
                        title="Diesen Gewinner ersetzen"
                        className="ml-auto rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-subtle hover:border-brand/40 hover:text-ink"
                      >
                        ↻ ersetzen
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Codes vor dem Ende (Vorrat) */}
          {!g.ended && g.rewardCode && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-bg-elevated px-2 py-1 text-xs">
              <span className="text-ink-subtle">Codes hinterlegt:</span>
              <code className="font-mono text-ink">{g.rewardCode.split("\n").filter(Boolean).length}</code>
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
