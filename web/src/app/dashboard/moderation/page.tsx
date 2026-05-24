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
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Server</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Moderation</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Aktive Timeouts, Bans und Verwarnungen. Aufheben/Löschen mit einem Klick — wird im
          Log-Channel gepostet.
        </p>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <div>
            <div className="font-semibold">Bot nicht erreichbar</div>
            <div className="mt-0.5 text-xs text-rose-300/80">{error}</div>
          </div>
        </div>
      )}

      {/* Stat-Kacheln oben */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Aktive Timeouts"
          count={timeouts.length}
          tone="amber"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          }
        />
        <StatCard
          label="Aktive Bans"
          count={bans.length}
          tone="rose"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m4.93 4.93 14.14 14.14" />
            </svg>
          }
        />
        <StatCard
          label="Verwarnungen"
          count={warningEntries.length}
          sublabel="letzte 50"
          tone="purple"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          }
        />
      </div>

      <SectionCard
        title="Aktive Timeouts"
        count={timeouts.length}
        tone="amber"
        emptyMessage="Aktuell keine Timeouts."
      >
        <TimeoutList items={timeouts} />
      </SectionCard>

      <SectionCard
        title="Aktive Bans"
        count={bans.length}
        tone="rose"
        emptyMessage="Keine aktiven Bans."
      >
        <BanList items={bans} />
      </SectionCard>

      <SectionCard
        title="Verwarnungen"
        count={warningEntries.length}
        sublabel="Letzte 50 — Klick auf User für Profil und vollständige Historie."
        tone="purple"
        emptyMessage="Noch keine Verwarnungen."
      >
        <WarningsList items={warningEntries} />
      </SectionCard>
    </div>
  );
}

function StatCard({
  label,
  count,
  sublabel,
  tone,
  icon,
}: {
  label: string;
  count: number;
  sublabel?: string;
  tone: "amber" | "rose" | "purple";
  icon: React.ReactNode;
}) {
  const isEmpty = count === 0;
  const borderBg = isEmpty
    ? "border-line bg-bg-elevated/40"
    : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/[0.06]"
      : tone === "rose"
        ? "border-rose-500/30 bg-rose-500/[0.06]"
        : "border-purple-500/30 bg-purple-500/[0.06]";
  const iconBg = isEmpty
    ? "bg-zinc-500/10 text-zinc-400"
    : tone === "amber"
      ? "bg-amber-500/15 text-amber-400"
      : tone === "rose"
        ? "bg-rose-500/15 text-rose-400"
        : "bg-purple-500/15 text-purple-400";
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${borderBg}`}>
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold tabular-nums text-ink">{count}</div>
        <div className="text-xs text-ink-muted">{label}</div>
        {sublabel && <div className="text-[10px] text-ink-subtle">{sublabel}</div>}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  count,
  sublabel,
  tone,
  emptyMessage,
  children,
}: {
  title: string;
  count: number;
  sublabel?: string;
  tone: "amber" | "rose" | "purple";
  emptyMessage: string;
  children: React.ReactNode;
}) {
  const accent =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-300"
      : tone === "rose"
        ? "bg-rose-500/15 text-rose-300"
        : "bg-purple-500/15 text-purple-300";
  return (
    <section className="card p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {sublabel && <p className="mt-0.5 text-xs text-ink-subtle">{sublabel}</p>}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${accent}`}
        >
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
