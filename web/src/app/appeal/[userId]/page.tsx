import { prisma, getConfig } from "@repo/db";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/PublicFooter";
import { verifyAppealToken } from "@/lib/appealToken";
import { AppealForm } from "./AppealForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ key?: string }>;
}

const STATUS_VIEW = {
  pending: {
    icon: "⏳",
    title: "Antrag wird geprüft",
    text: "Dein Entbannungsantrag ist eingegangen. Das Mod-Team schaut ihn sich an — schau später hier wieder vorbei.",
    tone: "border-amber-500/30 bg-amber-500/[0.06]",
  },
  approved: {
    icon: "✅",
    title: "Antrag angenommen",
    text: "Du wurdest entbannt und kannst dem Server wieder beitreten.",
    tone: "border-emerald-500/30 bg-emerald-500/[0.06]",
  },
  denied: {
    icon: "❌",
    title: "Antrag abgelehnt",
    text: "Das Mod-Team hat deinen Antrag geprüft und abgelehnt. Diese Entscheidung ist endgültig.",
    tone: "border-rose-500/30 bg-rose-500/[0.06]",
  },
} as const;

export default async function AppealPage({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const { key } = await searchParams;

  if (!/^\d{17,20}$/.test(userId)) notFound();
  if (!verifyAppealToken(userId, key)) {
    return (
      <Shell serverName={null}>
        <div className="card p-8 text-center">
          <div className="text-3xl">🔒</div>
          <h1 className="mt-4 text-xl font-semibold text-ink">Link ungültig</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Dieser Appeal-Link ist nicht (mehr) gültig. Den korrekten Link findest du
            in der Ban-Benachrichtigung, die dir der Bot per DM geschickt hat.
          </p>
        </div>
      </Shell>
    );
  }

  const [config, appeal, member] = await Promise.all([
    getConfig(),
    prisma.banAppeal.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.member.findUnique({ where: { userId } }),
  ]);

  // Angenommener Antrag + erneuter Ban → neuer Antrag möglich; sonst Status zeigen.
  const showStatus = appeal && appeal.status !== "approved" ? appeal : null;
  const approvedAppeal = appeal?.status === "approved" ? appeal : null;

  return (
    <Shell serverName={config.guildName}>
      <header className="text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          {config.guildName ?? "Discord-Server"}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          Entbannungsantrag
        </h1>
        {member && (
          <p className="mt-2 text-sm text-ink-muted">
            für <span className="font-medium text-ink">{member.displayName}</span>
          </p>
        )}
      </header>

      {showStatus ? (
        <StatusCard
          status={showStatus.status as keyof typeof STATUS_VIEW}
          note={showStatus.decisionNote}
          createdAt={showStatus.createdAt}
        />
      ) : (
        <>
          {approvedAppeal && (
            <StatusCard status="approved" note={approvedAppeal.decisionNote} createdAt={approvedAppeal.createdAt} />
          )}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-ink">Warum sollten wir dich entbannen?</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Erkläre, was passiert ist und warum du eine zweite Chance verdienst.
              Du kannst genau einen Antrag stellen — nimm dir Zeit.
            </p>
            <AppealForm userId={userId} appealKey={key ?? ""} />
          </div>
        </>
      )}
    </Shell>
  );
}

function StatusCard({
  status,
  note,
  createdAt,
}: {
  status: keyof typeof STATUS_VIEW;
  note: string | null;
  createdAt: Date;
}) {
  const view = STATUS_VIEW[status];
  return (
    <div className={`rounded-2xl border p-6 text-center ${view.tone}`}>
      <div className="text-3xl">{view.icon}</div>
      <h2 className="mt-3 text-lg font-semibold text-ink">{view.title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{view.text}</p>
      {note && (
        <p className="mt-3 rounded-xl bg-bg-elevated/50 p-3 text-sm text-ink">
          <span className="font-semibold">Anmerkung des Teams:</span> {note}
        </p>
      )}
      <p className="mt-3 text-xs text-ink-subtle">
        Eingereicht am{" "}
        {createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

function Shell({ serverName, children }: { serverName: string | null; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-bg-base p-6">
      <div className="mx-auto max-w-xl space-y-6 pt-16">
        {children}
        <footer className="pt-6 text-center text-xs text-ink-subtle">
          <PublicFooter />
        </footer>
      </div>
    </main>
  );
}
