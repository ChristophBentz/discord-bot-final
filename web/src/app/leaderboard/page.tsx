import { getConfig, prisma } from "@repo/db";
import Link from "next/link";
import { progressFromXp, type Curve } from "../u/[userId]/levelCurve";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const PAGE_LIMIT = 100;

function formatVoice(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  if (h === 0) return `${totalMinutes}m`;
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

function formatCompact(n: number): string {
  if (n < 1000) return n.toLocaleString("de-DE");
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

interface Row {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  accentColor: number | null;
  xp: number;
  messageCount: number;
  voiceSeconds: number;
  level: number;
  xpInLevel: number;
  xpToNext: number;
}

export default async function LeaderboardPage() {
  const [config, publicMembers] = await Promise.all([
    getConfig(),
    prisma.member.findMany({
      where: { profilePublic: true, inServer: true, isBot: false },
      select: { userId: true, displayName: true, avatarUrl: true, accentColor: true },
    }),
  ]);

  const memberMap = new Map(publicMembers.map((m) => [m.userId, m]));
  const publicUserIds = Array.from(memberMap.keys());

  const [levels, aggregate, totalRanked] = await Promise.all([
    prisma.levelUser.findMany({
      where: { userId: { in: publicUserIds } },
      orderBy: [{ xp: "desc" }],
      take: PAGE_LIMIT,
    }),
    prisma.levelUser.aggregate({
      where: { userId: { in: publicUserIds } },
      _sum: { xp: true, messageCount: true, voiceSeconds: true },
    }),
    prisma.levelUser.count({ where: { userId: { in: publicUserIds }, xp: { gt: 0 } } }),
  ]);

  const curve: Curve = { base: config.xpLevelBase, mult: config.xpLevelMultiplier };

  const rows: Row[] = levels
    .map((l) => {
      const member = memberMap.get(l.userId);
      if (!member) return null;
      const progress = progressFromXp(l.xp, curve);
      return {
        userId: l.userId,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
        accentColor: member.accentColor,
        xp: l.xp,
        messageCount: l.messageCount,
        voiceSeconds: l.voiceSeconds,
        level: progress.level,
        xpInLevel: progress.xpInLevel,
        xpToNext: progress.xpToNext,
      };
    })
    .filter((r): r is Row => r !== null);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const totalXp = aggregate._sum.xp ?? 0;
  const totalMessages = aggregate._sum.messageCount ?? 0;
  const totalVoice = aggregate._sum.voiceSeconds ?? 0;

  const serverName = config.guildName ?? "Server";

  return (
    <main className="min-h-screen bg-bg-base pb-20">
      {/* Top-Bar: Server-Identität + Public-Badge */}
      <header className="border-b border-line bg-bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-bg-card/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {config.guildIconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.guildIconUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-line"
              />
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
                {serverName[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{serverName}</div>
              <div className="text-[11px] text-ink-subtle">Community-Leaderboard</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live · alle 60s
          </div>
        </div>
      </header>

      {/* Hero mit Stats */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(60% 80% at 80% 0%, rgba(236, 72, 153, 0.18), transparent 60%),
              radial-gradient(50% 70% at 10% 100%, rgba(168, 85, 247, 0.16), transparent 55%),
              linear-gradient(180deg, #11111a 0%, #0a0a0f 100%)
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-10 sm:py-14">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-card/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-brand" fill="currentColor">
                <path d="M12 2 9.5 8.5 2 9l6 5.5L6 22l6-4 6 4-2-7.5L22 9l-7.5-.5L12 2Z" />
              </svg>
              Öffentliches Leaderboard
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Rangliste
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted">
              Die aktivsten Mitglieder von <span className="text-ink">{serverName}</span> —
              sortiert nach gesammelten XP aus Chat und Voice.
            </p>
          </div>

          {/* Stats-KPIs */}
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Mitglieder" value={totalRanked.toString()} />
            <StatCard label="Gesamt-XP" value={formatCompact(totalXp)} />
            <StatCard label="Nachrichten" value={formatCompact(totalMessages)} />
            <StatCard label="Voice-Zeit" value={formatVoice(totalVoice)} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 pt-10 space-y-10">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-bg-card px-6 py-20 text-center">
            <div className="text-3xl">📭</div>
            <div className="mt-3 text-sm font-medium text-ink">Noch keine Daten</div>
            <p className="mx-auto mt-1 max-w-sm text-xs text-ink-muted">
              Sobald Mitglieder XP sammeln und ihr Profil öffentlich ist, erscheinen sie hier.
            </p>
          </div>
        ) : (
          <>
            {/* TOP DREI */}
            <section>
              <SectionLabel>Top Drei</SectionLabel>
              <div className="mt-4 space-y-4">
                {top3[0] && <ChampionCard row={top3[0]} />}
                {(top3[1] || top3[2]) && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {top3[1] && <RunnerUpCard place={2} row={top3[1]} />}
                    {top3[2] && <RunnerUpCard place={3} row={top3[2]} />}
                  </div>
                )}
              </div>
            </section>

            {rest.length > 0 && (
              <section>
                <div className="flex items-end justify-between">
                  <SectionLabel>Rangliste</SectionLabel>
                  <div className="text-[11px] text-ink-subtle">
                    Plätze 4 – {rows.length}
                  </div>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-bg-card">
                  <ul className="divide-y divide-line">
                    {rest.map((r, i) => (
                      <LeaderboardRow key={r.userId} place={i + 4} row={r} />
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}

        <footer className="border-t border-line pt-6 text-center text-xs text-ink-subtle">
          <div>
            Mitglieder mit privatem Profil werden nicht angezeigt.{" "}
            Mit{" "}
            <code className="rounded bg-bg-elevated px-1 py-0.5 text-[10px]">/profil</code>{" "}
            im Discord verwaltest du deine Sichtbarkeit.
          </div>
          <div className="mt-3">
            Powered by{" "}
            <a
              href="https://moser-dev.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              moser-dev.com
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

// ─── Wiederverwendbare Bausteine ────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-subtle">
        {children}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-card/80 px-4 py-3 backdrop-blur">
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}

// ─── Champion-Hero (Platz #1) ───────────────────────────────────────────────

function ChampionCard({ row }: { row: Row }) {
  const xpPercent =
    row.xpToNext > 0 ? Math.min(100, Math.round((row.xpInLevel / row.xpToNext) * 100)) : 0;

  return (
    <Link
      href={`/u/${row.userId}`}
      className="group relative block overflow-hidden rounded-3xl border border-yellow-400/30 bg-bg-card transition-all hover:-translate-y-1 hover:border-yellow-400/50"
    >
      {/* Glow-Hintergrund */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(80% 100% at 100% 0%, rgba(250, 204, 21, 0.18), transparent 60%),
            radial-gradient(60% 100% at 0% 100%, rgba(168, 85, 247, 0.15), transparent 55%)
          `,
        }}
      />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />

      <div className="relative flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-7">
        <div className="relative shrink-0">
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-3xl drop-shadow-lg">
            👑
          </div>
          {row.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.avatarUrl}
              alt=""
              className="h-28 w-28 rounded-full ring-4 ring-yellow-400/50 shadow-2xl shadow-yellow-500/30"
            />
          ) : (
            <span className="grid h-28 w-28 place-items-center rounded-full bg-brand-gradient text-3xl font-semibold text-white ring-4 ring-yellow-400/50 shadow-2xl">
              {row.displayName[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-300">
            🏆 Champion · Platz #1
          </div>
          <h2 className="mt-2 truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {row.displayName}
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-ink-muted sm:justify-start">
            <span>
              <span className="text-base font-semibold text-white">Level {row.level}</span>
            </span>
            <span>{row.xp.toLocaleString("de-DE")} XP</span>
            <span className="hidden sm:inline">·</span>
            <span>{row.messageCount.toLocaleString("de-DE")} Nachrichten</span>
            <span className="hidden sm:inline">·</span>
            <span>{formatVoice(row.voiceSeconds)} Voice</span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-ink-subtle sm:justify-start sm:gap-2">
              <span>Fortschritt zu Level {row.level + 1}</span>
              <span className="sm:ml-auto">{xpPercent}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-pink-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Runner-Up (Plätze #2 + #3) ─────────────────────────────────────────────

function RunnerUpCard({ place, row }: { place: 2 | 3; row: Row }) {
  const config =
    place === 2
      ? {
          label: "🥈",
          badgeText: "Silber",
          ringClass: "ring-zinc-300/40",
          borderClass: "border-zinc-300/20 hover:border-zinc-300/40",
          badgeClass: "bg-zinc-300/15 text-zinc-200",
        }
      : {
          label: "🥉",
          badgeText: "Bronze",
          ringClass: "ring-orange-400/40",
          borderClass: "border-orange-400/20 hover:border-orange-400/40",
          badgeClass: "bg-orange-400/15 text-orange-200",
        };

  const xpPercent =
    row.xpToNext > 0 ? Math.min(100, Math.round((row.xpInLevel / row.xpToNext) * 100)) : 0;

  return (
    <Link
      href={`/u/${row.userId}`}
      className={`group flex items-center gap-4 rounded-2xl border bg-bg-card p-5 transition-all hover:-translate-y-1 ${config.borderClass}`}
    >
      <div className="relative shrink-0">
        <span className="absolute -bottom-1 -right-1 z-10 grid h-7 w-7 place-items-center rounded-full bg-bg-card text-lg shadow-lg ring-2 ring-bg-card">
          {config.label}
        </span>
        {row.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.avatarUrl}
            alt=""
            className={`h-16 w-16 rounded-full ring-2 ${config.ringClass}`}
          />
        ) : (
          <span
            className={`grid h-16 w-16 place-items-center rounded-full bg-brand-gradient text-xl font-semibold text-white ring-2 ${config.ringClass}`}
          >
            {row.displayName[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.badgeClass}`}
        >
          #{place} · {config.badgeText}
        </div>
        <div className="mt-1 truncate text-base font-semibold text-white">
          {row.displayName}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
          <span className="font-medium text-ink">Level {row.level}</span>
          <span>·</span>
          <span>{row.xp.toLocaleString("de-DE")} XP</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-pink-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// ─── Listen-Zeile ab Platz 4 ─────────────────────────────────────────────────

function LeaderboardRow({ place, row }: { place: number; row: Row }) {
  const xpPercent =
    row.xpToNext > 0 ? Math.min(100, Math.round((row.xpInLevel / row.xpToNext) * 100)) : 0;

  return (
    <li>
      <Link
        href={`/u/${row.userId}`}
        className="grid grid-cols-[3rem_auto_1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-bg-hover/40"
      >
        <span className="text-sm font-semibold tabular-nums text-ink-subtle">
          #{place}
        </span>

        {row.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.avatarUrl}
            alt=""
            className="h-10 w-10 rounded-full ring-2 ring-bg-elevated"
          />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
            {row.displayName[0]?.toUpperCase() ?? "?"}
          </span>
        )}

        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{row.displayName}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] text-ink-subtle">Level {row.level}</span>
            <div className="h-1 w-24 overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-pink-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <span className="text-[11px] text-ink-subtle">
              {row.xp.toLocaleString("de-DE")} XP
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-4 text-right text-xs text-ink-muted sm:flex">
          <div className="w-20">
            <div className="text-[10px] uppercase tracking-wider text-ink-subtle">
              Nachrichten
            </div>
            <div className="mt-0.5 font-medium text-ink">
              {row.messageCount.toLocaleString("de-DE")}
            </div>
          </div>
          <div className="w-16">
            <div className="text-[10px] uppercase tracking-wider text-ink-subtle">Voice</div>
            <div className="mt-0.5 font-medium text-ink">{formatVoice(row.voiceSeconds)}</div>
          </div>
        </div>
      </Link>
    </li>
  );
}
