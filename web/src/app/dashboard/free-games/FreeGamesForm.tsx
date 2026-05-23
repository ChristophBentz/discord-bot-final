"use client";

import { useEffect, useState, useTransition } from "react";
import { Toggle } from "@/components/Toggle";
import { ChannelPicker, type ChannelOption } from "@/components/ChannelPicker";
import { MessagePreview } from "@/components/MessagePreview";
import { checkNow, saveFreeGamesSettings } from "./actions";

interface Initial {
  freeGamesEnabled: boolean;
  freeGamesChannelId: string | null;
  freeGamesEpic: boolean;
  freeGamesSteam: boolean;
  freeGamesGog: boolean;
  freeGamesConsole: boolean;
  freeGamesIncludeGames: boolean;
  freeGamesIncludeDlc: boolean;
  freeGamesIncludeLoot: boolean;
  freeGamesMessage: string | null;
  freeGamesPingRoleId: string | null;
  freeGamesFooterText: string | null;
  freeGamesLastCheck: Date | null;
}

export interface RoleOption {
  roleId: string;
  name: string;
  color: number;
}

interface Props {
  initial: Initial;
  channels: ChannelOption[];
  roles: RoleOption[];
  bot: { name: string; avatarUrl: string | null };
}

const MESSAGE_PRESETS: { label: string; text: string }[] = [
  { label: "Neutral", text: "🎮 Frische kostenlose Spiele für euch:" },
  { label: "Mit Ping", text: "{role} 🆓 Neue Free Games sind da — schnappt sie euch:" },
  { label: "Anzahl + Ping", text: "{role} 💰 {count} neue Aktionen verfügbar:" },
  { label: "Hype", text: "🔔 **FREE-GAME-ALARM!** {role} Schnell zugreifen ⬇️" },
  { label: "Kurz", text: "Neue Free Games:" },
];

function intToHex(color: number, fallback = "#a1a1aa"): string {
  if (!color) return fallback;
  return "#" + color.toString(16).padStart(6, "0");
}

function SubMenu({
  open,
  allowOverflow = false,
  children,
}: {
  open: boolean;
  allowOverflow?: boolean;
  children: React.ReactNode;
}) {
  const [overflowVisible, setOverflowVisible] = useState(open && allowOverflow);
  useEffect(() => {
    if (!allowOverflow) {
      setOverflowVisible(false);
      return;
    }
    if (open) {
      const t = setTimeout(() => setOverflowVisible(true), 220);
      return () => clearTimeout(t);
    }
    setOverflowVisible(false);
  }, [open, allowOverflow]);
  return (
    <div
      className={`grid transition-all duration-200 ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      } ${overflowVisible ? "overflow-visible" : "overflow-hidden"}`}
    >
      <div className="min-h-0">
        <div className="ml-3 mt-2 border-l-2 border-brand/30 pl-4">{children}</div>
      </div>
    </div>
  );
}

export function FreeGamesForm({ initial, channels, roles, bot }: Props) {
  const [enabled, setEnabled] = useState(initial.freeGamesEnabled);
  const [message, setMessage] = useState(initial.freeGamesMessage ?? "");
  const [pingRoleId, setPingRoleId] = useState(initial.freeGamesPingRoleId ?? "");
  const [roleOpen, setRoleOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [checkResult, setCheckResult] = useState<{ kind: "ok" | "error"; msg: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [isChecking, startCheck] = useTransition();

  const selectedRole = roles.find((r) => r.roleId === pingRoleId);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveFreeGamesSettings(formData);
      setFeedback(
        res.ok ? { kind: "ok", msg: "Gespeichert." } : { kind: "error", msg: res.error },
      );
    });
  };

  const onCheck = () => {
    setCheckResult(null);
    startCheck(async () => {
      const res = await checkNow();
      setCheckResult(
        res.ok
          ? {
              kind: "ok",
              msg: `${res.posted} gepostet, ${res.skipped} bereits gepostet, ${res.fetched} aktiv gefiltert.`,
            }
          : { kind: "error", msg: res.error },
      );
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5">
        <Toggle
          name="freeGamesEnabled"
          label="Free Games aktiv"
          description="Bot prüft alle 6h die Quellen und postet neue Gratis-Aktionen in den Channel."
          defaultChecked={initial.freeGamesEnabled}
          onCheckedChange={setEnabled}
        />
        <SubMenu open={enabled} allowOverflow>
          <div className="space-y-5 pb-4">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Post-Channel</span>
              <ChannelPicker
                name="freeGamesChannelId"
                defaultValue={initial.freeGamesChannelId}
                channels={channels}
                allowedTypes={[0, 5]}
                placeholder="— Channel wählen —"
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Quellen
              </div>
              <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5 divide-y divide-line">
                <Toggle
                  name="freeGamesEpic"
                  label="Epic Games Store"
                  defaultChecked={initial.freeGamesEpic}
                />
                <Toggle
                  name="freeGamesSteam"
                  label="Steam"
                  defaultChecked={initial.freeGamesSteam}
                />
                <Toggle name="freeGamesGog" label="GOG" defaultChecked={initial.freeGamesGog} />
                <Toggle
                  name="freeGamesConsole"
                  label="PlayStation / Xbox / Switch"
                  defaultChecked={initial.freeGamesConsole}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Inhalt
              </div>
              <div className="rounded-2xl border border-line bg-bg-elevated/40 px-5 divide-y divide-line">
                <Toggle
                  name="freeGamesIncludeGames"
                  label="Kostenlose Vollspiele"
                  defaultChecked={initial.freeGamesIncludeGames}
                />
                <Toggle
                  name="freeGamesIncludeDlc"
                  label="DLC"
                  defaultChecked={initial.freeGamesIncludeDlc}
                />
                <Toggle
                  name="freeGamesIncludeLoot"
                  label="In-Game-Loot (Skins, Currency, …)"
                  defaultChecked={initial.freeGamesIncludeLoot}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Begleitnachricht
              </div>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {MESSAGE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setMessage(p.text)}
                    className="rounded-lg border border-line bg-bg-elevated/60 px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-brand/40 hover:bg-bg-hover hover:text-ink"
                  >
                    {p.label}
                  </button>
                ))}
                {message && (
                  <button
                    type="button"
                    onClick={() => setMessage("")}
                    className="rounded-lg border border-line bg-bg-elevated/40 px-2.5 py-1 text-xs text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    Leeren
                  </button>
                )}
              </div>

              <textarea
                name="freeGamesMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Optional — Nachricht über den Embeds. Leer = nur Embeds."
                className="input min-h-[60px] resize-y w-full"
              />
              <p className="mt-1.5 text-xs text-ink-subtle">
                Platzhalter:{" "}
                <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px]">
                  {"{role}"}
                </code>{" "}
                = Rollen-Mention,{" "}
                <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px]">
                  {"{count}"}
                </code>{" "}
                = Anzahl neuer Spiele
              </p>

              <div className="mt-3">
                <MessagePreview
                  text={message
                    .replaceAll("{role}", "<@&123>")
                    .replaceAll("{count}", "3")}
                  botName={bot.name}
                  botAvatarUrl={bot.avatarUrl}
                  emptyText="nur Embeds, keine Begleitnachricht"
                  hint='Beispieldaten: 3 neue Spiele, Rollen-Mention als Platzhalter'
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Footer (optional)
              </div>
              <input
                name="freeGamesFooterText"
                defaultValue={initial.freeGamesFooterText ?? ""}
                maxLength={200}
                placeholder="z. B. Powered by Dota 2 Germany 2.0"
                className="input w-full"
              />
              <p className="mt-1.5 text-xs text-ink-subtle">
                Erscheint unten am Embed mit dem Server-Icon.
              </p>
            </div>

            <div className="relative">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Rolle pingen (optional)
              </div>
              <input type="hidden" name="freeGamesPingRoleId" value={pingRoleId} />
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
                <svg className="h-3.5 w-3.5 text-ink-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
          </div>
        </SubMenu>
      </div>

      {!enabled && (
        <>
          <input
            type="hidden"
            name="freeGamesChannelId"
            value={initial.freeGamesChannelId ?? ""}
          />
          <input type="hidden" name="freeGamesEpic" value={initial.freeGamesEpic ? "on" : ""} />
          <input type="hidden" name="freeGamesSteam" value={initial.freeGamesSteam ? "on" : ""} />
          <input type="hidden" name="freeGamesGog" value={initial.freeGamesGog ? "on" : ""} />
          <input
            type="hidden"
            name="freeGamesConsole"
            value={initial.freeGamesConsole ? "on" : ""}
          />
          <input
            type="hidden"
            name="freeGamesIncludeGames"
            value={initial.freeGamesIncludeGames ? "on" : ""}
          />
          <input
            type="hidden"
            name="freeGamesIncludeDlc"
            value={initial.freeGamesIncludeDlc ? "on" : ""}
          />
          <input
            type="hidden"
            name="freeGamesIncludeLoot"
            value={initial.freeGamesIncludeLoot ? "on" : ""}
          />
          <input type="hidden" name="freeGamesMessage" value={initial.freeGamesMessage ?? ""} />
          <input
            type="hidden"
            name="freeGamesPingRoleId"
            value={initial.freeGamesPingRoleId ?? ""}
          />
          <input
            type="hidden"
            name="freeGamesFooterText"
            value={initial.freeGamesFooterText ?? ""}
          />
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
          {isPending ? "Speichere…" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={onCheck}
          disabled={isChecking || !enabled || !initial.freeGamesChannelId}
          className="btn-secondary disabled:opacity-40"
          title={
            !enabled
              ? "Feature deaktiviert"
              : !initial.freeGamesChannelId
                ? "Erst speichern, dann prüfen"
                : "Jetzt eine Prüfung anstoßen"
          }
        >
          {isChecking ? "Prüfe…" : "🔄 Jetzt prüfen"}
        </button>
        {initial.freeGamesLastCheck && (
          <span className="text-xs text-ink-subtle">
            Letzter Check: {initial.freeGamesLastCheck.toLocaleString("de-DE")}
          </span>
        )}
        {feedback && (
          <span
            className={`text-sm ${feedback.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}
          >
            {feedback.msg}
          </span>
        )}
        {checkResult && (
          <span
            className={`text-sm ${checkResult.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}
          >
            {checkResult.msg}
          </span>
        )}
      </div>
    </form>
  );
}
