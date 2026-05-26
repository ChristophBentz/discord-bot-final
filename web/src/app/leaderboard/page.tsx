import { getConfig, prisma } from "@repo/db";
import Link from "next/link";
import { progressFromXp, type Curve } from "../u/[userId]/levelCurve";

export const dynamic = "force-dynamic";

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
  xp: number;
  messageCount: number;
  voiceSeconds: number;
  level: number;
}

export default async function LeaderboardPage() {
  const [config, publicMembers] = await Promise.all([
    getConfig(),
    prisma.member.findMany({
      where: { profilePublic: true, inServer: true, isBot: false },
      select: { userId: true, displayName: true, avatarUrl: true },
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
        xp: l.xp,
        messageCount: l.messageCount,
        voiceSeconds: l.voiceSeconds,
        level: progress.level,
      };
    })
    .filter((r): r is Row => r !== null);

  const totalXp = aggregate._sum.xp ?? 0;
  const totalMessages = aggregate._sum.messageCount ?? 0;
  const totalVoice = aggregate._sum.voiceSeconds ?? 0;
  const serverName = config.guildName ?? "Server";
  const maxXp = rows[0]?.xp ?? 0;

  return (
    <main className="min-h-screen bg-bg-base">
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-12 sm:pt-16">
        {/* Header */}
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          {config.guildIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.guildIconUrl}
              alt=""
              className="h-6 w-6 rounded-md ring-1 ring-line"
            />
          ) : null}
          <span>{serverName}</span>
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Leaderboard</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          Die aktivsten Mitglieder, sortiert nach gesammelten XP aus Chat und Voice.
        </p>

        {/* Inline-Stats — keine Card-Grids, nur Text */}
        {rows.length > 0 && (
          <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-ink-muted">
            <span>
              <span className="font-medium text-ink tabular-nums">{totalRanked}</span> Mitglieder
            </span>
            <span>
              <span className="font-medium text-ink tabular-nums">
                {totalXp.toLocaleString("de-DE")}
              </span>{" "}
              XP
            </span>
            <span>
              <span className="font-medium text-ink tabular-nums">
                {totalMessages.toLocaleString("de-DE")}
              </span>{" "}
              Nachrichten
            </span>
            <span>
              <span className="font-medium text-ink tabular-nums">{formatVoice(totalVoice)}</span>{" "}
              Voice
            </span>
          </div>
        )}

        {/* Liste */}
        {rows.length === 0 ? (
          <div className="mt-12 rounded-lg border border-line bg-bg-card px-6 py-12 text-center text-sm text-ink-muted">
            Noch keine Mitglieder mit XP.
          </div>
        ) : (
          <ol className="mt-10 divide-y divide-line border-y border-line">
            {rows.map((r, i) => (
              <LeaderboardRow key={r.userId} place={i + 1} row={r} maxXp={maxXp} />
            ))}
          </ol>
        )}

        <footer className="mt-12 space-y-2 text-xs text-ink-subtle">
          <p>
            Mitglieder mit privatem Profil sind nicht gelistet. Sichtbarkeit ändern: im Discord{" "}
            <code className="rounded bg-bg-elevated px-1 py-0.5">/profil</code>.
          </p>
          <p>
            <a
              href="https://moser-dev.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink-muted hover:underline"
            >
              moser-dev.com
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function rankColor(place: number): string {
  if (place === 1) return "text-yellow-300";
  if (place === 2) return "text-zinc-300";
  if (place === 3) return "text-orange-300";
  return "text-ink-subtle";
}

function LeaderboardRow({ place, row, maxXp }: { place: number; row: Row; maxXp: number }) {
  const xpShare = maxXp > 0 ? row.xp / maxXp : 0;

  return (
    <li>
      <Link
        href={`/u/${row.userId}`}
        className="group grid grid-cols-[2.5rem_2.25rem_1fr_auto] items-center gap-4 py-3 transition-colors hover:bg-bg-card/40"
      >
        <span className={`text-right text-sm font-semibold tabular-nums ${rankColor(place)}`}>
          {place}
        </span>

        {row.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full ring-1 ring-line"
          />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-bg-elevated text-xs font-medium text-ink-muted ring-1 ring-line">
            {row.displayName[0]?.toUpperCase() ?? "?"}
          </span>
        )}

        <div className="min-w-0">
          <div className="truncate text-sm text-ink group-hover:text-white">
            {row.displayName}
          </div>
          <div className="mt-0.5 text-xs text-ink-subtle">
            Level {row.level}
            <span className="mx-2 text-ink-subtle/60">·</span>
            {row.messageCount.toLocaleString("de-DE")} Nachrichten
            <span className="mx-2 text-ink-subtle/60">·</span>
            {formatVoice(row.voiceSeconds)} Voice
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="text-sm tabular-nums text-ink">
            {row.xp.toLocaleString("de-DE")}{" "}
            <span className="text-xs text-ink-subtle">XP</span>
          </span>
          <div className="h-px w-20 bg-bg-elevated">
            <div className="h-full bg-ink/40" style={{ width: `${xpShare * 100}%` }} />
          </div>
        </div>
      </Link>
    </li>
  );
}
