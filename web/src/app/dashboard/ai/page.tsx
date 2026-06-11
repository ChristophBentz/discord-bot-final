import { getConfig, prisma } from "@repo/db";
import { DashboardTabs } from "@/components/DashboardTabs";
import { AiSettingsForm } from "./AiSettingsForm";
import { getAiStats } from "./actions";

export default async function AiPage() {
  const [config, channels, stats] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    getAiStats(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
                {/* Inline-Stats */}
                {stats.totalImages > 0 && (
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-y border-line py-3 text-sm">
                    <span className="text-ink-muted">
                      <span className="font-medium text-ink tabular-nums">{stats.imagesLast24h}</span> heute
                    </span>
                    <span className="text-ink-muted">
                      <span className="font-medium text-ink tabular-nums">{stats.imagesLast30d}</span>{" "}
                      letzte 30 Tage
                    </span>
                    <span className="text-ink-muted">
                      <span className="font-medium text-ink tabular-nums">{stats.totalImages}</span>{" "}
                      insgesamt
                    </span>
                  </div>
                )}

                {stats.topUsers.length > 0 && (
                  <section className="rounded-lg border border-line bg-bg-card p-5">
                    <h3 className="text-sm font-medium text-ink">Top User (30 Tage)</h3>
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
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
