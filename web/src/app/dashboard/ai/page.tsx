import { getConfig, prisma } from "@repo/db";
import { DashboardTabs } from "@/components/DashboardTabs";
import { FeatureHero } from "@/components/FeatureHero";
import { AiSettingsForm } from "./AiSettingsForm";
import { getAiStats } from "./actions";

export default async function AiPage() {
  const [config, channels, stats] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    getAiStats(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          Engagement
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">AI</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Bilder im Discord via{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 text-[12px]">/image</code>
          {" "}generieren. API-Key, Channel und Limits hier einstellen.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
          </svg>
        }
        title="AI"
        status={
          config.aiEnabled ? <>Bildgenerierung aktiv · /image</> : "AI deaktiviert"
        }
        active={config.aiEnabled}
        tone="brand"
        stats={[
          { label: "Heute", value: stats.imagesLast24h },
          { label: "30 Tage", value: stats.imagesLast30d },
          { label: "Insgesamt", value: stats.totalImages },
        ]}
      />

      <DashboardTabs
        defaultTab="settings"
        items={[
          {
            key: "settings",
            label: "Einstellungen",
            content: (
              <AiSettingsForm
                initial={{
                  aiEnabled: config.aiEnabled,
                  aiProvider: config.aiProvider,
                  aiApiKey: config.aiApiKey ?? "",
                  aiGroupId: config.aiGroupId ?? "",
                  aiApiBaseUrl: config.aiApiBaseUrl,
                  aiImageChannelId: config.aiImageChannelId ?? "",
                  aiImagesPerUserPerDay: config.aiImagesPerUserPerDay,
                  aiImageModel: config.aiImageModel,
                }}
                channels={channels.map((c) => ({
                  channelId: c.channelId,
                  name: c.name,
                  type: c.type,
                }))}
              />
            ),
          },
          {
            key: "usage",
            label: "Nutzung",
            content: (
              <div className="space-y-6">
                {stats.topUsers.length > 0 ? (
                  <section className="card p-6">
                    <h3 className="text-sm font-semibold text-ink">Top User (30 Tage)</h3>
                    <ul className="mt-3 divide-y divide-line">
                      {stats.topUsers.map((u, i) => (
                        <li
                          key={u.userId}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-right text-ink-subtle tabular-nums">
                              #{i + 1}
                            </span>
                            <span className="text-ink">{u.displayName ?? u.userId}</span>
                          </div>
                          <span className="text-ink-muted tabular-nums">{u.count} Bilder</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
                    Noch keine Bilder generiert.
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
