import { prisma } from "@repo/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { callBot } from "@/lib/botApi";
import { NotesPanel, type Note } from "./NotesPanel";
import { RolesManager, type RoleOption } from "./RolesManager";
import { ActivityHeatmap, type ActivityCell } from "./ActivityHeatmap";
import { FavoriteChannels, type ChannelRow } from "./FavoriteChannels";
import { WarnButton } from "./WarnButton";
import { TimeoutButton } from "./TimeoutButton";
import { KickButton } from "./KickButton";
import { BanButton } from "./BanButton";
import {
  AchievementsPanel,
  type UnlockedAchievement,
  type AvailableAchievement,
} from "./AchievementsPanel";

function intToHex(color: number, fallback = "#a1a1aa"): string {
  if (!color) return fallback;
  return "#" + color.toString(16).padStart(6, "0");
}

type PresenceStatus = "online" | "idle" | "dnd" | "offline";

const PRESENCE_INFO: Record<
  PresenceStatus,
  { color: string; label: string; ring: string }
> = {
  online: { color: "bg-emerald-500", label: "Online", ring: "ring-bg-card" },
  idle: { color: "bg-amber-400", label: "Abwesend", ring: "ring-bg-card" },
  dnd: { color: "bg-rose-500", label: "Bitte nicht stören", ring: "ring-bg-card" },
  offline: { color: "bg-zinc-500", label: "Offline", ring: "ring-bg-card" },
};

function PresenceIndicator({ status }: { status: PresenceStatus }) {
  const info = PRESENCE_INFO[status];
  return (
    <span
      title={info.label}
      className={`absolute bottom-2 right-2 grid h-5 w-5 place-items-center rounded-full ${info.color} ring-4 ${info.ring}`}
    >
      {status === "idle" && (
        // Halbmond-Symbol für idle
        <span className="block h-2.5 w-2.5 rounded-full bg-bg-card" style={{ transform: "translate(-2px, -2px)" }} />
      )}
      {status === "dnd" && (
        // Roter Minus-Bar
        <span className="block h-1 w-2.5 rounded-full bg-bg-card" />
      )}
      {status === "offline" && (
        // Kleiner Ring für offline
        <span className="block h-2 w-2 rounded-full bg-bg-card" />
      )}
    </span>
  );
}

function formatVoice(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m`;
  return `${h}h`;
}

function joinedLabel(date: Date | null): { value: string; sub: string } {
  if (!date) return { value: "—", sub: "" };
  const months = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const formatted = date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (months < 12) return { value: `${months} Mon.`, sub: formatted };
  const years = Math.floor(months / 12);
  return { value: `${years} J.`, sub: formatted };
}

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export default async function MemberProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  // Letzte 30 Tage für die Heat-Map: ältester String-Vergleich reicht (YYYY-MM-DD).
  const since = new Date();
  since.setDate(since.getDate() - 29);
  const sinceKey = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;

  const [member, allRoles, levelUser, warnings, notes, activity, inviteUse] = await Promise.all([
    prisma.member.findUnique({ where: { userId } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
    prisma.levelUser.findUnique({ where: { userId } }),
    prisma.warning.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.memberNote.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.hourlyActivity.findMany({
      where: { userId, date: { gte: sinceKey } },
      orderBy: [{ date: "asc" }, { hour: "asc" }],
    }),
    prisma.inviteUse.findFirst({ where: { userId }, orderBy: { joinedAt: "desc" } }),
  ]);

  const inviter = inviteUse?.inviterId
    ? await prisma.member.findUnique({
        where: { userId: inviteUse.inviterId },
        select: { displayName: true },
      })
    : null;
  const inviterLabel = inviter?.displayName ?? (inviteUse?.inviterId ? `User ${inviteUse.inviterId.slice(-4)}` : null);

  // Lieblings-Channels: letzte 7 Tage, gruppiert.
  const sinceWeek = new Date();
  sinceWeek.setDate(sinceWeek.getDate() - 6);
  const sinceWeekKey = `${sinceWeek.getFullYear()}-${String(sinceWeek.getMonth() + 1).padStart(2, "0")}-${String(sinceWeek.getDate()).padStart(2, "0")}`;
  const channelTotals = await prisma.channelActivity.groupBy({
    by: ["channelId"],
    where: { userId, date: { gte: sinceWeekKey } },
    _sum: { messages: true },
    orderBy: { _sum: { messages: "desc" } },
    take: 5,
  });
  const channelDefs = await prisma.guildChannel.findMany({
    where: { channelId: { in: channelTotals.map((c) => c.channelId) } },
  });
  const channelById = new Map(channelDefs.map((c) => [c.channelId, c]));
  const favoriteChannels: ChannelRow[] = channelTotals.map((c) => ({
    channelId: c.channelId,
    name: channelById.get(c.channelId)?.name ?? `Channel ${c.channelId.slice(-4)}`,
    messages: c._sum.messages ?? 0,
  }));

  const activityCells: ActivityCell[] = activity.map((c) => ({
    date: c.date,
    hour: c.hour,
    messages: c.messages,
    voiceSeconds: c.voiceSeconds,
  }));

  // Achievements: erworben + alle zum manuellen Vergeben
  const [unlockedRows, allAchievements] = await Promise.all([
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { awardedAt: "desc" },
    }),
    prisma.achievement.findMany({ orderBy: { name: "asc" } }),
  ]);
  const unlockedIds = new Set(unlockedRows.map((u) => u.achievementId));
  const unlocked: UnlockedAchievement[] = unlockedRows.map((u) => ({
    id: u.achievement.id,
    name: u.achievement.name,
    description: u.achievement.description,
    imageUrl: u.achievement.imageUrl,
    awardedAt: u.awardedAt.toISOString(),
  }));
  const available: AvailableAchievement[] = allAchievements
    .filter((a) => !unlockedIds.has(a.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      imageUrl: a.imageUrl,
      triggerType: a.triggerType,
    }));

  if (!member) notFound();

  // Banner + Accent-Color lazy refreshen: nur wenn noch nie geholt oder älter als 7 Tage
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const needsBannerRefresh =
    !member.bannerRefreshedAt || member.bannerRefreshedAt.getTime() < sevenDaysAgo;
  if (needsBannerRefresh) {
    const res = await callBot<{ bannerUrl: string | null }>(
      `/api/members/${userId}/refresh-profile`,
      { method: "POST" },
    );
    if (res.ok) {
      // frisch aus DB nachladen damit die neuen Werte verfügbar sind
      const fresh = await prisma.member.findUnique({ where: { userId } });
      if (fresh) {
        member.bannerUrl = fresh.bannerUrl;
        member.accentColor = fresh.accentColor;
        member.bannerRefreshedAt = fresh.bannerRefreshedAt;
        member.avatarUrl = fresh.avatarUrl;
      }
    }
  }

  let rank = 0;
  let totalRanked = 0;
  if (levelUser) {
    [rank, totalRanked] = await Promise.all([
      prisma.levelUser.count({ where: { xp: { gt: levelUser.xp } } }).then((c) => c + 1),
      prisma.levelUser.count(),
    ]);
  }

  const rolesById = new Map(allRoles.map((r) => [r.roleId, r]));
  const roleIds = member.roleIds ? member.roleIds.split(",").filter(Boolean) : [];
  const roles = roleIds
    .map((id) => rolesById.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => b.position - a.position);
  const topRole = roles[0];
  const topRoleColor = topRole ? intToHex(topRole.color, "#a855f7") : "#a855f7";

  // Aktuellen Presence-Status vom Bot holen (online/idle/dnd/offline).
  // Wenn Member nicht im Server → offline. Sonst Cache abfragen.
  let presenceStatus: "online" | "idle" | "dnd" | "offline" = "offline";
  if (member.inServer) {
    const r = await callBot<{ status: "online" | "idle" | "dnd" | "offline" }>(
      `/api/members/${userId}/presence`,
      { method: "GET" },
    );
    if (r.ok) presenceStatus = r.data.status;
  }

  const joined = joinedLabel(member.joinedAt);
  const noteRows: Note[] = notes.map((n) => ({
    id: n.id,
    authorName: n.authorName,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
  }));

  const stats = [
    {
      label: "Level",
      value: (levelUser?.level ?? 0).toString(),
      sub: rank ? `#${rank} von ${totalRanked}` : "noch keine XP",
      icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /></svg>,
      tone: "amber" as const,
    },
    {
      label: "XP",
      value: (levelUser?.xp ?? 0).toLocaleString("de-DE"),
      sub: "gesamt",
      icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" /></svg>,
      tone: "violet" as const,
    },
    {
      label: "Nachrichten",
      value: (levelUser?.messageCount ?? 0).toLocaleString("de-DE"),
      sub: "gesamt",
      icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><path d="M21 12a8 8 0 0 1-12.4 6.7L3 20l1.3-4.6A8 8 0 1 1 21 12Z" /></svg>,
      tone: "blue" as const,
    },
    {
      label: "Voice-Zeit",
      value: formatVoice(levelUser?.voiceSeconds ?? 0),
      sub: "gesamt",
      icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" /></svg>,
      tone: "pink" as const,
    },
    {
      label: "Beitritt",
      value: joined.value,
      sub: inviterLabel ? `eingeladen von ${inviterLabel}` : joined.sub,
      icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>,
      tone: "green" as const,
    },
    {
      label: "Verwarnungen",
      value: warnings.length.toString(),
      sub: warnings.length === 0 ? "Saubere Akte" : "Einträge",
      icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}><path d="M12 4 2 21h20L12 4Z" /><path d="M12 10v5" /><circle cx="12" cy="18" r="0.5" fill="currentColor" /></svg>,
      tone: warnings.length === 0 ? ("green" as const) : ("red" as const),
    },
  ];

  const toneClasses: Record<string, string> = {
    amber: "bg-icon-amber-bg text-icon-amber-fg",
    violet: "bg-icon-violet-bg text-icon-violet-fg",
    blue: "bg-icon-blue-bg text-icon-blue-fg",
    pink: "bg-icon-pink-bg text-icon-pink-fg",
    green: "bg-icon-green-bg text-icon-green-fg",
    red: "bg-icon-red-bg text-icon-red-fg",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Banner + Identity Card */}
      <section className="card overflow-hidden p-0">
        {/* Banner — User-Banner falls Nitro, sonst Accent-Color-Gradient, sonst Default */}
        {member.bannerUrl ? (
          <div
            className="h-32 bg-cover bg-center"
            style={{ backgroundImage: `url(${member.bannerUrl})` }}
          />
        ) : member.accentColor ? (
          <div
            className="h-32"
            style={{
              background: `linear-gradient(135deg, #${member.accentColor
                .toString(16)
                .padStart(6, "0")} 0%, #1a0b2e 100%)`,
            }}
          />
        ) : (
          <div
            className="h-32"
            style={{
              background: `
                radial-gradient(120% 140% at 100% 0%, rgb(var(--accent-to) / 0.55), transparent 60%),
                radial-gradient(120% 140% at 0% 100%, rgb(var(--accent-from) / 0.55), transparent 55%),
                linear-gradient(135deg, #11111a 0%, rgb(var(--accent-from) / 0.25) 100%)
              `,
            }}
          />
        )}

        <div className="px-6 pb-6">
          {/* Top-Reihe: Avatar + Name (unten-bündig) — Buttons rechts */}
          <div className="-mt-16 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                {member.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatarUrl}
                    alt=""
                    className="h-32 w-32 rounded-full ring-[6px] ring-bg-card shadow-2xl"
                  />
                ) : (
                  <span className="grid h-32 w-32 place-items-center rounded-full bg-brand-gradient text-4xl font-semibold text-white ring-[6px] ring-bg-card shadow-2xl">
                    {member.displayName[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
                {member.inServer && (
                  <PresenceIndicator status={presenceStatus} />
                )}
              </div>

              {/* Name + Status-Badge — Badge inline neben dem Namen, unten-bündig */}
              <div className="flex flex-wrap items-end gap-3 pb-1">
                <h1 className="text-4xl font-bold tracking-tight text-white">
                  {member.displayName}
                </h1>
                {member.inServer && (
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-bg-elevated/60 px-2.5 py-1 text-xs">
                    <span
                      className={`h-2 w-2 rounded-full ${PRESENCE_INFO[presenceStatus].color}`}
                    />
                    <span className="text-ink-muted">{PRESENCE_INFO[presenceStatus].label}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action-Buttons rechts, ebenfalls unten-bündig */}
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <WarnButton userId={userId} userName={member.displayName} />
              <TimeoutButton
                userId={userId}
                userName={member.displayName}
                protected={member.isProtected}
              />
              <KickButton
                userId={userId}
                userName={member.displayName}
                protected={member.isProtected}
              />
              <BanButton
                userId={userId}
                userName={member.displayName}
                protected={member.isProtected}
              />
            </div>
          </div>

          {/* Meta-Block unter Avatar — links eingerückt um Avatar-Breite */}
          <div className="mt-4 pl-[148px]">
            <div className="flex flex-wrap items-center gap-2">
              {topRole && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium"
                  style={{
                    color: topRoleColor,
                    borderColor: topRoleColor + "55",
                    backgroundColor: topRoleColor + "1f",
                    boxShadow: `0 0 24px ${topRoleColor}22`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: topRoleColor }} />
                  {topRole.name}
                </span>
              )}
              {member.isBot && (
                <span className="rounded-md bg-icon-blue-bg px-2 py-0.5 text-[10px] font-semibold uppercase text-icon-blue-fg">
                  Bot
                </span>
              )}
              <span className="font-mono text-sm text-ink-muted">
                @{member.username}
                {member.discriminator ? `#${member.discriminator}` : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-elevated/60 px-2 py-0.5 font-mono text-[11px] text-ink-subtle">
                ID
                <span className="text-ink-muted">{member.userId}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stat-Cards in EINER Karte mit feinen Trennlinien */}
      <section className="card overflow-hidden p-0">
        <div className="grid grid-cols-2 gap-px bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                  {s.label}
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-md ${toneClasses[s.tone]}`}>
                  {s.icon}
                </span>
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums">{s.value}</div>
              <div className="mt-0.5 truncate text-xs text-ink-muted">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Zwei Spalten */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 text-base font-semibold">Rollen ({roles.length})</h2>
            <RolesManager
              userId={userId}
              currentRoles={roles.map(
                (r): RoleOption => ({ roleId: r.roleId, name: r.name, color: r.color }),
              )}
              allRoles={allRoles.map(
                (r): RoleOption => ({ roleId: r.roleId, name: r.name, color: r.color }),
              )}
            />
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Aktivität · Letzte 30 Tage</h2>
              <span className="pill-accent">Heat-Map</span>
            </div>
            <ActivityHeatmap cells={activityCells} />
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Lieblings-Channels</h2>
              <span className="badge">Diese Woche</span>
            </div>
            <FavoriteChannels channels={favoriteChannels} />
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                Achievements ({unlocked.length})
              </h2>
              <span className="badge">{available.length} verfügbar</span>
            </div>
            <AchievementsPanel userId={userId} unlocked={unlocked} available={available} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Mod-History</h2>
              {warnings.length === 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Saubere Akte
                </span>
              )}
            </div>
            {warnings.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </span>
                <div>
                  <div className="text-sm font-medium">Keine Vergehen</div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {member.displayName} hat keine Moderationseinträge.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {warnings.map((w) => (
                  <li key={w.id} className="rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between text-xs text-ink-subtle">
                      <span>
                        {w.createdAt.toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span>von {w.moderatorId.slice(-4)}</span>
                    </div>
                    <div className="mt-0.5 text-ink">{w.reason}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-base font-semibold">Notizen (Staff)</h2>
            <NotesPanel userId={userId} notes={noteRows} />
          </section>

          <Link href="/dashboard/members" className="block text-center text-xs text-ink-subtle hover:text-ink">
            ← Zurück zur Mitgliederliste
          </Link>
        </div>
      </div>
    </div>
  );
}
