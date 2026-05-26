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

  const levels = await prisma.levelUser.findMany({
    where: { userId: { in: Array.from(memberMap.keys()) } },
    orderBy: [{ xp: "desc" }],
    take: PAGE_LIMIT,
  });

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

  return (
    <main className="min-h-screen bg-bg-base pb-16">
      {/* Hero */}
      <div className="relative h-44 w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(120% 140% at 100% 0%, rgba(236, 72, 153, 0.5), transparent 60%),
              radial-gradient(120% 140% at 0% 100%, rgba(168, 85, 247, 0.45), transparent 55%),
              linear-gradient(135deg, #1a0b2e 0%, #2d1845 50%, #4a1d56 100%)
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: "linear-gradient(to bottom, transparent, #0a0a0f)" }}
        />
      </div>

      <div className="relative z-10 mx-auto -mt-28 max-w-5xl px-6 space-y-8">
        <header className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">
            Server
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            🏆 Leaderboard
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Die aktivsten Mitglieder des Servers — sortiert nach Gesamt-XP.
            <br />
            <span className="text-xs text-ink-subtle">
              Mitglieder mit privatem Profil werden nicht angezeigt.
            </span>
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-bg-card px-6 py-16 text-center text-sm text-ink-muted">
            Noch keine sichtbaren Mitglieder mit XP.
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Anordnung: #2 — #1 — #3 (Podium-Optik), nur ab sm */}
                <PodiumCard place={2} row={top3[1]} />
                <PodiumCard place={1} row={top3[0]} />
                <PodiumCard place={3} row={top3[2]} />
              </section>
            )}

            {/* Rest-Liste */}
            {rest.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-line bg-bg-card">
                <div className="border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  Plätze 4 – {rows.length}
                </div>
                <ul className="divide-y divide-line">
                  {rest.map((r, i) => (
                    <LeaderboardRow key={r.userId} place={i + 4} row={r} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <footer className="pt-4 text-center text-xs text-ink-subtle">
          Powered by{" "}
          <a
            href="https://moser-dev.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            moser-dev.com
          </a>
        </footer>
      </div>
    </main>
  );
}

// ─── Podium-Karte für Plätze 1–3 ────────────────────────────────────────────

function PodiumCard({ place, row }: { place: 1 | 2 | 3; row?: Row }) {
  if (!row) {
    return <div className="hidden sm:block" />;
  }

  const config = {
    1: {
      label: "🥇",
      heightClass: "sm:scale-110 sm:-mt-4",
      ringClass: "ring-yellow-400/60 shadow-yellow-500/20",
      borderClass: "border-yellow-400/30",
      accentClass: "from-yellow-400/20 to-yellow-500/0",
      placeText: "text-yellow-400",
    },
    2: {
      label: "🥈",
      heightClass: "sm:mt-6",
      ringClass: "ring-zinc-300/40 shadow-zinc-400/20",
      borderClass: "border-zinc-400/20",
      accentClass: "from-zinc-300/15 to-zinc-400/0",
      placeText: "text-zinc-300",
    },
    3: {
      label: "🥉",
      heightClass: "sm:mt-10",
      ringClass: "ring-orange-400/40 shadow-orange-500/20",
      borderClass: "border-orange-400/20",
      accentClass: "from-orange-400/15 to-orange-500/0",
      placeText: "text-orange-300",
    },
  }[place];

  const xpPercent =
    row.xpToNext > 0 ? Math.min(100, Math.round((row.xpInLevel / row.xpToNext) * 100)) : 0;

  return (
    <Link
      href={`/u/${row.userId}`}
      className={`group relative overflow-hidden rounded-2xl border bg-bg-card p-5 text-center transition-transform hover:-translate-y-1 ${config.borderClass} ${config.heightClass}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${config.accentClass}`}
      />
      <div className="relative">
        <div className={`text-3xl ${config.placeText}`}>{config.label}</div>
        <div className="mt-2 flex justify-center">
          {row.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.avatarUrl}
              alt=""
              className={`h-20 w-20 rounded-full ring-4 shadow-lg ${config.ringClass}`}
            />
          ) : (
            <span
              className={`grid h-20 w-20 place-items-center rounded-full bg-brand-gradient text-2xl font-semibold text-white ring-4 ${config.ringClass}`}
            >
              {row.displayName[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <div className="mt-3 truncate text-base font-semibold text-white">
          {row.displayName}
        </div>
        <div className="mt-1 text-xs text-ink-subtle">Platz #{place}</div>

        <div className="mt-4 flex items-baseline justify-center gap-3">
          <span className="text-3xl font-bold text-white">{row.level}</span>
          <span className="text-xs uppercase tracking-wider text-ink-subtle">Level</span>
        </div>
        <div className="mt-1 text-xs text-ink-muted">
          {row.xp.toLocaleString("de-DE")} XP
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
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
        className="grid grid-cols-[3rem_auto_1fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-bg-hover/40"
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
