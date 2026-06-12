import { Suspense } from "react";
import { prisma } from "@repo/db";
import { callBot } from "@/lib/botApi";
import type { BanEntry, TimeoutEntry } from "./ModerationLists";
import type { WarningEntry } from "./WarningsList";
import type { AppealEntry } from "./AppealsList";
import type { ModEventEntry } from "./ModEventsList";
import { ModerationTabs } from "./ModerationTabs";

interface BotState {
  timeouts: TimeoutEntry[];
  bans: BanEntry[];
}

const TAB_KEYS = ["timeouts", "bans", "appeals", "warnings", "actions"] as const;
type TabParam = (typeof TAB_KEYS)[number];

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // ?tab=actions öffnet direkt den gewünschten Tab (z.B. verlinkt von Audit Logs).
  const { tab } = await searchParams;
  const initialTab = TAB_KEYS.includes(tab as TabParam) ? (tab as TabParam) : undefined;

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
        <ModerationData initialTab={initialTab} />
      </Suspense>
    </div>
  );
}

// Bans/Timeouts kommen vom Bot (Discord-REST) — streamen, statt die Navigation zu blockieren.
async function ModerationData({ initialTab }: { initialTab?: TabParam }) {
  const [botRes, warnings, appeals, modEvents, config] = await Promise.all([
    callBot<BotState>("/api/moderation/state", { method: "GET" }),
    prisma.warning.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.banAppeal.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.modEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.config.findUnique({ where: { id: 1 }, select: { recordModEvents: true } }),
  ]);

  const timeouts = botRes.ok ? botRes.data.timeouts : [];
  const bans = botRes.ok ? botRes.data.bans : [];
  const error = botRes.ok ? null : botRes.error;

  // Member-Infos für Warnings (User + Moderator) und Appeals (Avatare)
  const memberIds = Array.from(
    new Set([
      ...warnings.flatMap((w) => [w.userId, w.moderatorId]),
      ...appeals.map((a) => a.userId),
      ...modEvents.flatMap((e) => [e.userId, ...(e.moderatorId ? [e.moderatorId] : [])]),
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

  const modEventEntries: ModEventEntry[] = modEvents.map((e) => {
    const user = memberById.get(e.userId);
    const mod = e.moderatorId ? memberById.get(e.moderatorId) : null;
    return {
      id: e.id,
      userId: e.userId,
      userName: user?.displayName ?? `User ${e.userId.slice(-4)}`,
      userAvatarUrl: user?.avatarUrl ?? null,
      moderatorName: mod?.displayName ?? (e.moderatorId ? `Mod ${e.moderatorId.slice(-4)}` : null),
      action: e.action,
      detail: e.detail,
      createdAt: e.createdAt.toISOString(),
    };
  });

  return (
    <ModerationTabs
      error={error}
      timeouts={timeouts}
      bans={bans}
      appeals={appealEntries}
      warnings={warningEntries}
      modEvents={modEventEntries}
      modEventRecording={config?.recordModEvents ?? true}
      initialTab={initialTab}
    />
  );
}

function ModerationSkeleton() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
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
