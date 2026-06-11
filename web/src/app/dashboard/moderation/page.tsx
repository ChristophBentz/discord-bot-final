import { Suspense } from "react";
import { prisma } from "@repo/db";
import { callBot } from "@/lib/botApi";
import type { BanEntry, TimeoutEntry } from "./ModerationLists";
import type { WarningEntry } from "./WarningsList";
import type { AppealEntry } from "./AppealsList";
import { ModerationTabs } from "./ModerationTabs";

interface BotState {
  timeouts: TimeoutEntry[];
  bans: BanEntry[];
}

export default function ModerationPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Moderation</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Moderation</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Timeouts, Bans, Entbannungsanträge und Verwarnungen — Aktionen landen im Log-Channel.
        </p>
      </header>
      <Suspense fallback={<ModerationSkeleton />}>
        <ModerationData />
      </Suspense>
    </div>
  );
}

// Bans/Timeouts kommen vom Bot (Discord-REST) — streamen, statt die Navigation zu blockieren.
async function ModerationData() {
  const [botRes, warnings, appeals] = await Promise.all([
    callBot<BotState>("/api/moderation/state", { method: "GET" }),
    prisma.warning.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.banAppeal.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
  ]);

  const timeouts = botRes.ok ? botRes.data.timeouts : [];
  const bans = botRes.ok ? botRes.data.bans : [];
  const error = botRes.ok ? null : botRes.error;

  // Member-Infos für Warnings (User + Moderator) und Appeals (Avatare)
  const memberIds = Array.from(
    new Set([
      ...warnings.flatMap((w) => [w.userId, w.moderatorId]),
      ...appeals.map((a) => a.userId),
    ]),
  );
  const members = await prisma.member.findMany({
    where: { userId: { in: memberIds } },
    select: { userId: true, displayName: true, avatarUrl: true },
  });
  const memberById = new Map(members.map((m) => [m.userId, m]));

  const appealEntries: AppealEntry[] = appeals.map((a) => ({
    id: a.id,
    userId: a.userId,
    username: a.username,
    avatarUrl: memberById.get(a.userId)?.avatarUrl ?? null,
    banReason: a.banReason,
    text: a.text,
    status: a.status,
    decidedBy: a.decidedBy,
    decisionNote: a.decisionNote,
    inviteUrl: a.inviteUrl,
    createdAt: a.createdAt.toISOString(),
  }));

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
    <ModerationTabs
      error={error}
      timeouts={timeouts}
      bans={bans}
      appeals={appealEntries}
      warnings={warningEntries}
    />
  );
}

function ModerationSkeleton() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[74px] animate-pulse rounded-2xl border border-line bg-bg-elevated/40"
          />
        ))}
      </div>
      <section className="card animate-pulse p-6">
        <div className="h-5 w-40 rounded bg-bg-elevated" />
        <div className="mt-2 h-3 w-72 max-w-full rounded bg-bg-elevated" />
        <div className="mt-5 space-y-2">
          <div className="h-16 rounded-xl bg-bg-elevated/60" />
          <div className="h-16 rounded-xl bg-bg-elevated/60" />
          <div className="h-16 rounded-xl bg-bg-elevated/60" />
        </div>
      </section>
    </>
  );
}
