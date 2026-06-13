import { getConfig, prisma } from "@/lib/db";
import { CreateAchievementForm } from "./CreateAchievementForm";
import { AchievementCard, type AchievementItem } from "./AchievementCard";
import { NotifySettingsForm } from "./NotifySettingsForm";
import { FeatureHero } from "@/components/FeatureHero";
import { DashboardTabs } from "@/components/DashboardTabs";

export default async function AchievementsPage() {
  const [config, achievements, channels, totalAwards, uniqueRecipients] = await Promise.all([
    getConfig(),
    prisma.achievement.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { awards: true } } },
    }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.userAchievement.count(),
    prisma.userAchievement.groupBy({ by: ["userId"] }).then((g) => g.length),
  ]);

  const items: AchievementItem[] = achievements.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    imageUrl: a.imageUrl,
    triggerType: a.triggerType,
    triggerValue: a.triggerValue,
    awardsCount: a._count.awards,
  }));

  const notifyActive = config.achievementNotifyDM || config.achievementNotifyChannel;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Engagement</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Achievements</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Lege Achievements an, die automatisch bei Milestones oder manuell vergeben werden.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7" />
            <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
          </svg>
        }
        title="Achievements"
        status={
          items.length > 0
            ? `${items.length} ${items.length === 1 ? "Achievement" : "Achievements"} angelegt`
            : "Noch keine Achievements"
        }
        active={items.length > 0}
        tone="amber"
        stats={[
          {
            label: "Angelegt",
            value: items.length,
          },
          {
            label: "Vergaben gesamt",
            value: totalAwards.toLocaleString("de-DE"),
          },
          {
            label: "Empfänger",
            value: uniqueRecipients,
            sublabel: uniqueRecipients === 1 ? "User" : "User",
          },
        ]}
      />

      <DashboardTabs
        defaultTab="list"
        items={[
          {
            key: "list",
            label: "Achievements",
            count: items.length,
            content: (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Bestehende Achievements</h2>
                  <span className="badge">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
                    Noch keine Achievements angelegt.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((a) => (
                      <AchievementCard key={a.id} a={a} />
                    ))}
                  </div>
                )}
              </section>
            ),
          },
          {
            key: "create",
            label: "Neu erstellen",
            content: (
              <section className="card p-6">
                <h2 className="mb-1 text-lg font-semibold">Neues Achievement</h2>
                <p className="mb-5 text-sm text-ink-muted">
                  Bild ist optional, wird im Embed als Thumbnail angezeigt.
                </p>
                <CreateAchievementForm />
              </section>
            ),
          },
          {
            key: "notify",
            label: "Benachrichtigungen",
            content: (
              <section className="card p-6">
                <h2 className="mb-1 text-lg font-semibold">
                  Benachrichtigungen
                  {notifyActive && (
                    <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                      Aktiv
                    </span>
                  )}
                </h2>
                <p className="mb-5 text-sm text-ink-muted">
                  Wohin der Bot Achievements ankündigt. Beide Optionen können gleichzeitig aktiv sein.
                </p>
                <NotifySettingsForm
                  initial={{
                    achievementNotifyDM: config.achievementNotifyDM,
                    achievementNotifyChannel: config.achievementNotifyChannel,
                    achievementChannelId: config.achievementChannelId,
                  }}
                  channels={channels.map((c) => ({
                    channelId: c.channelId,
                    name: c.name,
                    type: c.type,
                    parentId: c.parentId,
                    position: c.position,
                  }))}
                />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
