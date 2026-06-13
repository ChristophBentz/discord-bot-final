import { prisma, getConfig } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/PublicFooter";
import { verifyAppealToken } from "@/lib/appealToken";
import { callBot } from "@/lib/botApi";
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

  const [config, appeal, member, botRes] = await Promise.all([
    getConfig(),
    prisma.banAppeal.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.member.findUnique({ where: { userId } }),
    callBot<{ bans: { userId: string }[] }>("/api/moderation/state", { method: "GET" }),
  ]);

  // true/false wenn der Bot erreichbar ist, sonst null (= unbekannt).
  const banned = botRes.ok ? botRes.data.bans.some((b) => b.userId === userId) : null;

  // Was zeigen wir? Der echte Ban-Status entscheidet — eine alte „angenommen"-Karte
  // wäre Quatsch, wenn der User inzwischen erneut gebannt wurde.
  let view: "pending" | "denied" | "approved" | "notBanned" | "form";
  if (appeal?.status === "pending") view = "pending";
  else if (appeal?.status === "denied") view = "denied";
  else if (appeal?.status === "approved" && banned !== true) view = "approved";
  else if (!appeal && banned === false) view = "notBanned";
  else view = "form"; // gebannt (oder Status unbekannt) ohne offenen/abgelehnten Antrag

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

      {(view === "pending" || view === "denied" || view === "approved") && appeal && (
        <StatusCard
          status={view}
          note={appeal.decisionNote}
          createdAt={appeal.createdAt}
          inviteUrl={appeal.inviteUrl}
        />
      )}

      {view === "notBanned" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
          <div className="text-3xl">👍</div>
          <h2 className="mt-3 text-lg font-semibold text-ink">Du bist nicht gebannt</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Für diesen Account liegt aktuell kein Ban vor — du kannst dem Server ganz
            normal beitreten.
          </p>
        </div>
      )}

      {view === "form" && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">Warum sollten wir dich entbannen?</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Erkläre, was passiert ist und warum du eine zweite Chance verdienst.
            Du kannst genau einen Antrag stellen — nimm dir Zeit.
          </p>
          <AppealForm userId={userId} appealKey={key ?? ""} />
        </div>
      )}
    </Shell>
  );
}

function StatusCard({
  status,
  note,
  createdAt,
  inviteUrl,
}: {
  status: keyof typeof STATUS_VIEW;
  note: string | null;
  createdAt: Date;
  inviteUrl?: string | null;
}) {
  const view = STATUS_VIEW[status];
  return (
    <div className={`rounded-2xl border p-6 text-center ${view.tone}`}>
      <div className="text-3xl">{view.icon}</div>
      <h2 className="mt-3 text-lg font-semibold text-ink">{view.title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{view.text}</p>
      {status === "approved" && inviteUrl && (
        <a
          href={inviteUrl}
          className="mt-4 inline-block rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow"
        >
          Server wieder beitreten →
        </a>
      )}
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
