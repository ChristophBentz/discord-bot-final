import { prisma } from "@repo/db";
import { FeatureHero } from "@/components/FeatureHero";
import { GiveawayManager, type GiveawayRow } from "./GiveawayManager";

export default async function GiveawaysPage() {
  const [giveaways, channels, roles] = await Promise.all([
    prisma.giveaway.findMany({
      orderBy: [{ ended: "asc" }, { endsAt: "desc" }],
      include: { entries: { select: { userId: true, isWinner: true } } },
      take: 50,
    }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
  ]);

  const channelById = new Map(channels.map((c) => [c.channelId, c.name]));
  const roleById = new Map(roles.map((r) => [r.roleId, r.name]));

  // Gewinner-Namen auflösen
  const winnerIds = [
    ...new Set(giveaways.flatMap((g) => g.entries.filter((e) => e.isWinner).map((e) => e.userId))),
  ];
  const winnerMembers = winnerIds.length
    ? await prisma.member.findMany({
        where: { userId: { in: winnerIds } },
        select: { userId: true, displayName: true },
      })
    : [];
  const nameById = new Map(winnerMembers.map((m) => [m.userId, m.displayName]));

  const rows: GiveawayRow[] = giveaways.map((g) => ({
    id: g.id,
    channelId: g.channelId,
    channelName: channelById.get(g.channelId) ?? null,
    prize: g.prize,
    description: g.description,
    winnerCount: g.winnerCount,
    minLevel: g.minLevel,
    requiredRoleName: g.requiredRoleId ? (roleById.get(g.requiredRoleId) ?? null) : null,
    minMemberDays: g.minMemberDays,
    endsAt: g.endsAt.toISOString(),
    ended: g.ended,
    entryCount: g.entries.length,
    winners: g.entries
      .filter((e) => e.isWinner)
      .map((e) => ({ userId: e.userId, name: nameById.get(e.userId) ?? `User ${e.userId.slice(-4)}` })),
  }));

  const activeCount = rows.filter((g) => !g.ended).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Engagement</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Giveaways</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Verlose Preise mit Teilnahme-Button und optionalen Bedingungen (Level, Rolle,
          Mitgliedszeit). Der Bot zieht zum Ende automatisch die Gewinner.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
          </svg>
        }
        title="Giveaways"
        status={activeCount > 0 ? <>{activeCount} laufend</> : "Aktuell kein laufendes Giveaway"}
        active={activeCount > 0}
        tone="brand"
        stats={[
          { label: "Laufend", value: activeCount },
          { label: "Gesamt", value: rows.length },
        ]}
      />

      <GiveawayManager
        channels={channels.map((c) => ({
          channelId: c.channelId,
          name: c.name,
          type: c.type,
          parentId: c.parentId,
          position: c.position,
        }))}
        roles={roles.map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }))}
        giveaways={rows}
      />
    </div>
  );
}
