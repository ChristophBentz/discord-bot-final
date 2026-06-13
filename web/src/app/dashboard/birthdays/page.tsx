import { getConfig, prisma } from "@repo/db";
import { FeatureHero } from "@/components/FeatureHero";
import { DashboardTabs } from "@/components/DashboardTabs";
import { BirthdayForm } from "./BirthdayForm";

const MONTHS = [
  "Jan", "Feb", "März", "Apr", "Mai", "Juni",
  "Juli", "Aug", "Sept", "Okt", "Nov", "Dez",
];

// Tage bis zum nächsten Vorkommen von Tag/Monat (ignoriert das Jahr).
function daysUntil(day: number, month: number): number {
  const today = new Date();
  const y = today.getFullYear();
  let next = new Date(y, month - 1, day);
  next.setHours(0, 0, 0, 0);
  const start = new Date(y, today.getMonth(), today.getDate());
  if (next < start) next = new Date(y + 1, month - 1, day);
  return Math.round((next.getTime() - start.getTime()) / 86_400_000);
}

export default async function BirthdaysPage() {
  const [config, channels, roles, withBirthday] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
    prisma.member.findMany({
      where: { inServer: true, birthdayDay: { not: null }, birthdayMonth: { not: null } },
      select: { userId: true, displayName: true, avatarUrl: true, birthdayDay: true, birthdayMonth: true },
    }),
  ]);

  const upcoming = withBirthday
    .map((m) => ({ ...m, days: daysUntil(m.birthdayDay!, m.birthdayMonth!) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 15);

  const channelName = config.birthdayChannelId
    ? channels.find((c) => c.channelId === config.birthdayChannelId)?.name
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Engagement</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Geburtstage</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Mitglieder hinterlegen ihren Geburtstag selbst per{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 text-[12px]">/geburtstag</code> — der
          Bot kündigt sie zum Tagesbeginn im gewählten Channel an.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-8H4v8M4 16h16M2 21h20M12 4a2 2 0 0 0-2 2c0 1.5 2 4 2 4s2-2.5 2-4a2 2 0 0 0-2-2z" />
            <path d="M6 13V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
          </svg>
        }
        title="Geburtstage"
        status={
          config.birthdayEnabled && channelName ? (
            <>Aktiv · Ankündigung in #{channelName}</>
          ) : (
            "Inaktiv — kein Channel gewählt"
          )
        }
        active={config.birthdayEnabled && Boolean(config.birthdayChannelId)}
        tone="brand"
        stats={[
          { label: "Hinterlegt", value: withBirthday.length },
          {
            label: "Nächster",
            value: upcoming[0]
              ? upcoming[0].days === 0
                ? "Heute! 🎉"
                : `in ${upcoming[0].days} T.`
              : "—",
          },
        ]}
      />

      <DashboardTabs
        defaultTab="settings"
        items={[
          {
            key: "settings",
            label: "Einstellungen",
            content: (
              <BirthdayForm
                initial={{
                  birthdayEnabled: config.birthdayEnabled,
                  birthdayChannelId: config.birthdayChannelId,
                  birthdayPingRoleId: config.birthdayPingRoleId,
                  birthdayMessage: config.birthdayMessage,
                }}
                channels={channels.map((c) => ({
                  channelId: c.channelId,
                  name: c.name,
                  type: c.type,
                  parentId: c.parentId,
                  position: c.position,
                }))}
                roles={roles.map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }))}
                bot={{ name: config.botName ?? "Bot", avatarUrl: config.botAvatarUrl }}
              />
            ),
          },
          {
            key: "upcoming",
            label: "Kommende",
            count: upcoming.length,
            content: (
              <section className="card overflow-hidden">
                <div className="border-b border-line px-6 py-4">
                  <h2 className="text-sm font-semibold">Nächste Geburtstage</h2>
                </div>
                {upcoming.length === 0 ? (
                  <div className="m-6 rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
                    Noch hat niemand einen Geburtstag hinterlegt.
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {upcoming.map((m) => (
                      <li key={m.userId} className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-3">
                          {m.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-line" />
                          ) : (
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-bg-elevated text-xs font-semibold">
                              {m.displayName[0]?.toUpperCase()}
                            </span>
                          )}
                          <span className="text-sm font-medium">{m.displayName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-ink-muted">
                            {m.birthdayDay}. {MONTHS[m.birthdayMonth! - 1]}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              m.days === 0 ? "bg-brand-subtle text-brand" : "bg-bg-elevated text-ink-subtle"
                            }`}
                          >
                            {m.days === 0 ? "Heute 🎉" : m.days === 1 ? "Morgen" : `in ${m.days} Tagen`}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
