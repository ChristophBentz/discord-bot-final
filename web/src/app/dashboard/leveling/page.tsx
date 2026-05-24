import { getConfig, prisma } from "@repo/db";
import { LevelingForm } from "./LevelingForm";
import { FeatureHero } from "@/components/FeatureHero";

interface Curve { base: number; mult: number }

function xpForNextLevel(level: number, c: Curve): number {
  return Math.round(c.base * Math.pow(1 + c.mult / 100, level));
}
function progressFromXp(
  totalXp: number,
  c: Curve,
): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForNextLevel(level, c) && level < 500) {
    remaining -= xpForNextLevel(level, c);
    level += 1;
  }
  return { level, xpInLevel: remaining, xpToNext: xpForNextLevel(level, c) };
}

function formatVoiceTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LevelingPage() {
  const [c, top, channels, totalUsers, leader, totalVoice] = await Promise.all([
    getConfig(),
    prisma.levelUser.findMany({ orderBy: [{ xp: "desc" }], take: 25 }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.levelUser.count(),
    prisma.levelUser.findFirst({ orderBy: [{ xp: "desc" }], select: { displayName: true, xp: true } }),
    prisma.levelUser.aggregate({ _sum: { voiceSeconds: true } }),
  ]);
  const curve: Curve = { base: c.xpLevelBase, mult: c.xpLevelMultiplier };
  const leaderLevel = leader ? progressFromXp(leader.xp, curve).level : 0;
  const totalVoiceSec = totalVoice._sum.voiceSeconds ?? 0;
  const totalVoiceH = Math.floor(totalVoiceSec / 3600);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">XP-System</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Leveling</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Members sammeln XP durch Nachrichten und Zeit in Voice-Channeln.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16M10 14.66V17c0 .55.47.98.97 1.21C12.15 18.75 13 20.24 13 22M14 14.66V17c0 .55-.47.98-.97 1.21C11.85 18.75 11 20.24 11 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
          </svg>
        }
        title="Leveling"
        status={
          c.levelingEnabled ? (
            <>XP-System aktiv · {totalUsers} aktive User</>
          ) : (
            "Leveling deaktiviert"
          )
        }
        active={c.levelingEnabled}
        tone="amber"
        stats={[
          {
            label: "Top-User",
            value: leader ? `Lvl ${leaderLevel}` : "—",
            sublabel: leader?.displayName ?? undefined,
          },
          {
            label: "XP / Nachricht",
            value: `${c.xpPerMessageMin}–${c.xpPerMessageMax}`,
          },
          {
            label: "Voice gesamt",
            value: `${totalVoiceH.toLocaleString("de-DE")}h`,
          },
        ]}
      />

      <LevelingForm
          initial={{
            levelingEnabled: c.levelingEnabled,
            levelUpChannelId: c.levelUpChannelId,
            xpPerMessageMin: c.xpPerMessageMin,
            xpPerMessageMax: c.xpPerMessageMax,
            xpCooldownSeconds: c.xpCooldownSeconds,
            xpPerMinuteVoice: c.xpPerMinuteVoice,
            xpLevelBase: c.xpLevelBase,
            xpLevelMultiplier: c.xpLevelMultiplier,
            levelUpMessage: c.levelUpMessage,
          }}
          bot={{ name: c.botName ?? "Bot", avatarUrl: c.botAvatarUrl }}
          channels={channels.map((ch) => ({
            channelId: ch.channelId,
            name: ch.name,
            type: ch.type,
            parentId: ch.parentId,
            position: ch.position,
          }))}
        />

      <section className="card overflow-hidden p-0">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Top 25 deines Servers — sortiert nach Gesamt-XP.
          </p>
        </div>

        {top.length === 0 ? (
          <div className="m-6 rounded-xl border border-dashed border-line px-5 py-10 text-center text-sm text-ink-muted">
            Noch keine XP gesammelt.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-y border-line bg-bg-elevated/50 text-xs uppercase tracking-wide text-ink-subtle">
                <tr>
                  <th className="px-6 py-2.5 text-left font-medium">#</th>
                  <th className="px-3 py-2.5 text-left font-medium">User</th>
                  <th className="px-3 py-2.5 text-right font-medium">Level</th>
                  <th className="px-3 py-2.5 text-right font-medium">XP</th>
                  <th className="px-3 py-2.5 text-right font-medium">Nachrichten</th>
                  <th className="px-6 py-2.5 text-right font-medium">Voice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {top.map((u, i) => {
                  const { level, xpInLevel, xpToNext } = progressFromXp(u.xp, curve);
                  const ratio = xpToNext > 0 ? Math.min(1, xpInLevel / xpToNext) : 0;
                  const place = i < 3 ? MEDALS[i] : `${i + 1}`;
                  return (
                    <tr key={u.userId} className="hover:bg-bg-hover/50">
                      <td className="px-6 py-3 text-ink-muted tabular-nums">{place}</td>
                      <td className="min-w-0 px-3 py-3">
                        <div className="flex flex-col">
                          <span className="truncate font-medium">{u.displayName ?? u.userId}</span>
                          <span className="truncate font-mono text-[11px] text-ink-subtle">
                            {u.userId}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">{level}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <div className="flex flex-col items-end gap-1">
                          <span>{u.xp.toLocaleString("de-DE")}</span>
                          <div className="h-1 w-20 overflow-hidden rounded-full bg-bg-elevated">
                            <div
                              className="h-full rounded-full bg-brand-gradient"
                              style={{ width: `${ratio * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {u.messageCount.toLocaleString("de-DE")}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">
                        {formatVoiceTime(u.voiceSeconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
