import { getConfig, prisma } from "@repo/db";
import { CreateAchievementForm } from "./CreateAchievementForm";
import { AchievementCard, type AchievementItem } from "./AchievementCard";
import { NotifySettingsForm } from "./NotifySettingsForm";

export default async function AchievementsPage() {
  const [config, achievements, channels] = await Promise.all([
    getConfig(),
    prisma.achievement.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { awards: true } } },
    }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
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

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">XP-System</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Achievements</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Lege Achievements an, die automatisch bei Milestones oder manuell vergeben werden.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">Benachrichtigungen</h2>
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

      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">Neues Achievement</h2>
        <p className="mb-5 text-sm text-ink-muted">
          Bild ist optional, wird im Embed als Thumbnail angezeigt.
        </p>
        <CreateAchievementForm />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bestehende Achievements</h2>
          <span className="badge">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-bg-card/50 px-5 py-10 text-center text-sm text-ink-muted">
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
    </div>
  );
}
