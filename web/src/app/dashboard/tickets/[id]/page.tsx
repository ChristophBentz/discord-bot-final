import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { ReplyForm } from "./ReplyForm";
import { LiveRefresh } from "@/components/LiveRefresh";

function formatDateTime(d: Date): string {
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isFinite(ticketId)) notFound();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();

  // Ticket-Ersteller + alle Message-Autoren in EINER Query laden (statt zwei seriellen).
  const memberIds = Array.from(
    new Set([ticket.userId, ...ticket.messages.map((m) => m.authorId)]),
  );
  const relatedMembers = await prisma.member.findMany({
    where: { userId: { in: memberIds } },
    select: { userId: true, displayName: true, avatarUrl: true, username: true },
  });
  const memberById = new Map(relatedMembers.map((m) => [m.userId, m]));
  const member = memberById.get(ticket.userId) ?? null;
  const avatarById = new Map(relatedMembers.map((m) => [m.userId, m.avatarUrl]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/dashboard/tickets"
        className="text-xs text-ink-subtle hover:text-ink"
      >
        ← Alle Tickets
      </Link>

      <header className="card flex items-center gap-4 p-5">
        {member?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full ring-1 ring-line"
          />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
            {(member?.displayName ?? ticket.username ?? "?")[0]?.toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Ticket #{ticket.id}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                ticket.status === "open"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-bg-elevated text-ink-muted"
              }`}
            >
              {ticket.status}
            </span>
          </div>
          <div className="mt-0.5 text-lg font-semibold">
            {member?.displayName ?? ticket.username ?? `User ${ticket.userId}`}
          </div>
          <div className="font-mono text-[11px] text-ink-subtle">{ticket.userId}</div>
        </div>
        <div className="text-right text-xs text-ink-subtle">
          Geöffnet: {formatDateTime(ticket.createdAt)}
          {ticket.closedAt && <div>Geschlossen: {formatDateTime(ticket.closedAt)}</div>}
        </div>
      </header>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            Konversation
          </h2>
          {ticket.status === "open" && <LiveRefresh intervalMs={2500} />}
        </div>
        {ticket.messages.length === 0 ? (
          <div className="text-sm text-ink-muted">Noch keine Nachrichten.</div>
        ) : (
          <ul className="space-y-3">
            {ticket.messages.map((m) => {
              const avatarUrl = avatarById.get(m.authorId);
              return (
              <li
                key={m.id}
                className={`flex gap-3 ${m.fromMod ? "flex-row-reverse" : ""}`}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full ring-1 ring-line"
                  />
                ) : (
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      m.fromMod
                        ? "bg-brand-gradient text-white"
                        : "bg-bg-elevated text-ink-muted"
                    }`}
                  >
                    {m.authorName[0]?.toUpperCase()}
                  </span>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    m.fromMod
                      ? "bg-brand-subtle text-ink"
                      : "bg-bg-elevated/60 text-ink"
                  }`}
                >
                  <div
                    className={`mb-0.5 text-[11px] ${m.fromMod ? "text-brand" : "text-ink-muted"}`}
                  >
                    {m.authorName}
                    {" · "}
                    {formatDateTime(m.createdAt)}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          Antworten
        </h2>
        <ReplyForm ticketId={ticket.id} closed={ticket.status !== "open"} />
      </section>
    </div>
  );
}
