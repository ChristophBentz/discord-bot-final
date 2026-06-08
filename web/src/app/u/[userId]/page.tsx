import { getConfig, prisma } from "@repo/db";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/PublicFooter";
import { verifyProfileToken } from "@/lib/profileToken";
import { progressFromXp, type Curve } from "./levelCurve";
import { OwnerPanel } from "./OwnerPanel";

export const dynamic = "force-dynamic";

function formatVoiceTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} Min`;
  return `${h} Std ${m} Min`;
}

function formatJoined(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ key?: string }>;
}

export default async function PublicProfile({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const { key } = await searchParams;

  if (!/^\d{17,20}$/.test(userId)) notFound();

  const [member, levelUser, totalLevelUsers, higherRanked, achievements, unlockedAchievements, config] =
    await Promise.all([
      prisma.member.findUnique({ where: { userId } }),
      prisma.levelUser.findUnique({ where: { userId } }),
      prisma.levelUser.count(),
      prisma.levelUser.findUnique({ where: { userId } }).then(async (l) =>
        l ? prisma.levelUser.count({ where: { xp: { gt: l.xp } } }) : 0,
      ),
      prisma.achievement.findMany({ orderBy: { id: "asc" } }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { awardedAt: "desc" },
      }),
      getConfig(),
    ]);

  if (!member) notFound();

  const isOwner = verifyProfileToken(userId, member.profileTokenVersion, key);
  const showFull = member.profilePublic || isOwner;

  // Hülle für privaten Modus (Außenstehende)
  if (!showFull) {
    return (
      <main className="min-h-screen bg-bg-base p-6">
        <div className="mx-auto max-w-2xl pt-20 text-center">
          <div className="mx-auto h-24 w-24">
            {member.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatarUrl}
                alt=""
                className="h-24 w-24 rounded-full ring-4 ring-bg-elevated shadow-2xl"
              />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-full bg-brand-gradient text-2xl font-semibold text-white">
                {member.displayName[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-ink">{member.displayName}</h1>
          <p className="mt-3 text-sm text-ink-muted">
            🔒 Dieses Profil ist privat — der User hat die öffentliche Ansicht deaktiviert.
          </p>
          <footer className="mt-12 text-xs text-ink-subtle">
            <PublicFooter />
          </footer>
        </div>
      </main>
    );
  }

  const curve: Curve = { base: config.xpLevelBase, mult: config.xpLevelMultiplier };
  const xp = levelUser?.xp ?? 0;
  const progress = progressFromXp(xp, curve);
  const xpPercent = progress.xpToNext > 0
    ? Math.min(100, Math.round((progress.xpInLevel / progress.xpToNext) * 100))
    : 0;
  const rank = levelUser ? higherRanked + 1 : null;
  const voiceSec = levelUser?.voiceSeconds ?? 0;
  const messageCount = levelUser?.messageCount ?? 0;

  return (
    <main className="min-h-screen bg-bg-base pb-16">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden">
        {member.bannerUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${member.bannerUrl})` }}
          />
        ) : member.accentColor ? (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, #${member.accentColor
                .toString(16)
                .padStart(6, "0")} 0%, #1a0b2e 100%)`,
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(120% 140% at 100% 0%, rgba(236, 72, 153, 0.55), transparent 60%),
                radial-gradient(120% 140% at 0% 100%, rgba(168, 85, 247, 0.55), transparent 55%),
                linear-gradient(135deg, #1a0b2e 0%, #2d1845 50%, #4a1d56 100%)
              `,
            }}
          />
        )}
        {/* Sanfter Übergang vom Banner zur Page-Hintergrundfarbe */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: "linear-gradient(to bottom, transparent, #0a0a0f)" }}
        />
      </div>

      <div className="relative z-10 mx-auto -mt-20 max-w-4xl px-6 space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-end gap-5">
          <div className="shrink-0">
            {member.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatarUrl}
                alt=""
                className="h-32 w-32 rounded-full ring-[6px] ring-bg-base shadow-2xl"
              />
            ) : (
              <span className="grid h-32 w-32 place-items-center rounded-full bg-brand-gradient text-4xl font-semibold text-white ring-[6px] ring-bg-base shadow-2xl">
                {member.displayName[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {member.displayName}
            </h1>
            <div className="mt-1 text-sm text-ink-muted">@{member.username}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
              {member.joinedAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-bg-elevated px-2.5 py-1">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  Mitglied seit {formatJoined(member.joinedAt)}
                </span>
              )}
              {!member.profilePublic && isOwner && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300">
                  🔒 Profil ist aktuell privat
                </span>
              )}
              {!member.inServer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2.5 py-1 text-ink-subtle">
                  Hat den Server verlassen
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Owner-Panel: nur sichtbar mit gültigem Token */}
        {isOwner && (
          <OwnerPanel
            userId={userId}
            ownerKey={key!}
            isPublic={member.profilePublic}
          />
        )}

        {/* Level-Karte */}
        <section className="rounded-2xl border border-line bg-bg-card p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand">
                Leveling
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-5xl font-bold tracking-tight text-white">
                  {progress.level}
                </span>
                <span className="text-sm text-ink-muted">Level</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-ink-subtle">
                Server-Rang
              </div>
              <div className="mt-1 text-2xl font-semibold text-ink">
                {rank ? `#${rank}` : "—"}
                {rank && (
                  <span className="ml-1.5 text-sm font-normal text-ink-subtle">
                    / {totalLevelUsers}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between text-xs text-ink-muted">
              <span>{progress.xpInLevel.toLocaleString("de-DE")} XP</span>
              <span>
                bis Level {progress.level + 1}: {progress.xpToNext.toLocaleString("de-DE")} XP
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-pink-500 transition-all"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="mt-1 text-right text-[11px] text-ink-subtle">
              {xpPercent}% · gesamt {xp.toLocaleString("de-DE")} XP
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label="Nachrichten"
              value={messageCount.toLocaleString("de-DE")}
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
            />
            <Stat
              label="Voice-Zeit"
              value={formatVoiceTime(voiceSec)}
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                </svg>
              }
            />
            <Stat
              label="Achievements"
              value={`${unlockedAchievements.length} / ${achievements.length}`}
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="6" />
                  <path d="m9 13.5-2 8 5-3 5 3-2-8" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Achievements */}
        <section className="rounded-2xl border border-line bg-bg-card p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-ink">Achievements</h2>
            <span className="text-xs text-ink-subtle">
              {unlockedAchievements.length} von {achievements.length} freigeschaltet
            </span>
          </div>
          {unlockedAchievements.length === 0 ? (
            <p className="text-sm text-ink-muted">Noch keine Achievements freigeschaltet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {unlockedAchievements.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-line bg-bg-elevated/40 p-3 text-center"
                >
                  {u.achievement.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.achievement.imageUrl}
                      alt=""
                      className="mx-auto h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-brand-gradient text-2xl">
                      🏆
                    </div>
                  )}
                  <div className="mt-2 text-sm font-medium text-ink line-clamp-1">
                    {u.achievement.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-subtle line-clamp-2">
                    {u.achievement.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="pt-2 text-center text-xs text-ink-subtle">
          <PublicFooter />
          {" · "}Tippe <code className="rounded bg-bg-elevated px-1 py-0.5 text-[11px]">/profil</code>{" "}
          in Discord für deinen Bearbeiten-Link
        </footer>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-elevated/40 px-3 py-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-subtle">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}
