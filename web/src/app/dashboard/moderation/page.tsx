import { prisma } from "@repo/db";
import { callBot } from "@/lib/botApi";
import {
  BanList,
  TimeoutList,
  type BanEntry,
  type TimeoutEntry,
} from "./ModerationLists";
import { WarningsList, type WarningEntry } from "./WarningsList";

interface BotState {
  timeouts: TimeoutEntry[];
  bans: BanEntry[];
}

export default async function ModerationPage() {
  const [botRes, warnings] = await Promise.all([
    callBot<BotState>("/api/moderation/state", { method: "GET" }),
    prisma.warning.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const timeouts = botRes.ok ? botRes.data.timeouts : [];
  const bans = botRes.ok ? botRes.data.bans : [];
  const error = botRes.ok ? null : botRes.error;

  // Member-Infos für Warnings (User + Moderator)
  const memberIds = Array.from(
    new Set(warnings.flatMap((w) => [w.userId, w.moderatorId])),
  );
  const members = await prisma.member.findMany({
    where: { userId: { in: memberIds } },
    select: { userId: true, displayName: true, avatarUrl: true },
  });
  const memberById = new Map(members.map((m) => [m.userId, m]));

  const warningEntries: WarningEntry[] = warnings.map((w) => {
    const user = memberById.get(w.userId);
    const mod = memberById.get(w.moderatorId);
    return {
      id: w.id,
      userId: w.userId,
      userName: user?.displayName ?? `User ${w.userId.slice(-4)}`,
      userAvatarUrl: user?.avatarUrl ?? null,
      moderatorId: w.moderatorId,
      moderatorName: mod?.displayName ?? `Mod ${w.moderatorId.slice(-4)}`,
      reason: w.reason,
      createdAt: w.createdAt.toISOString(),
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Server</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Moderation</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Aktive Timeouts, Bans und Verwarnungen. Aufheben/Löschen mit einem Klick — wird im Log-Channel gepostet.
        </p>
      </header>

      {error && (
        <div className="card border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-400">
          Bot nicht erreichbar: {error}
        </div>
      )}

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aktive Timeouts</h2>
          <span className="badge">{timeouts.length}</span>
        </div>
        <TimeoutList items={timeouts} />
      </section>

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aktive Bans</h2>
          <span className="badge">{bans.length}</span>
        </div>
        <BanList items={bans} />
      </section>

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Verwarnungen</h2>
            <p className="text-xs text-ink-subtle">
              Letzte 50. Klick auf User für Profil und vollständige Historie.
            </p>
          </div>
          <span className="badge">{warningEntries.length}</span>
        </div>
        <WarningsList items={warningEntries} />
      </section>
    </div>
  );
}
