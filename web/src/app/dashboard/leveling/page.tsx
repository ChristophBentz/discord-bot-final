import { getConfig, prisma } from "@repo/db";
import { LevelingForm } from "./LevelingForm";

function xpForNextLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}
function progressFromXp(totalXp: number): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level += 1;
  }
  return { level, xpInLevel: remaining, xpToNext: xpForNextLevel(level) };
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
  const [c, top, channels] = await Promise.all([
    getConfig(),
    prisma.levelUser.findMany({ orderBy: [{ xp: "desc" }], take: 25 }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">XP-System</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Leveling</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Members sammeln XP durch Nachrichten und Zeit in Voice-Channeln.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Einstellungen</h2>
        <p className="mt-1 mb-5 text-sm text-ink-muted">
          Anpassen, wie schnell User XP sammeln.
        </p>
        <LevelingForm
          initial={{
            levelingEnabled: c.levelingEnabled,
            levelUpChannelId: c.levelUpChannelId,
            xpPerMessageMin: c.xpPerMessageMin,
            xpPerMessageMax: c.xpPerMessageMax,
            xpCooldownSeconds: c.xpCooldownSeconds,
            xpPerMinuteVoice: c.xpPerMinuteVoice,
          }}
          channels={channels.map((ch) => ({
            channelId: ch.channelId,
            name: ch.name,
            type: ch.type,
            parentId: ch.parentId,
            position: ch.position,
          }))}
        />
      </section>

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
                  const { level, xpInLevel, xpToNext } = progressFromXp(u.xp);
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
