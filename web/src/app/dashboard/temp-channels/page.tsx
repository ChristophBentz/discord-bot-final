import { getConfig, prisma } from "@/lib/db";
import { TempChannelForm } from "./TempChannelForm";
import type { TriggerRow } from "./TriggerEditor";
import { FeatureHero } from "@/components/FeatureHero";
import { DashboardTabs } from "@/components/DashboardTabs";

export default async function TempChannelsPage() {
  const [config, triggers, active, channels] = await Promise.all([
    getConfig(),
    prisma.tempChannelTrigger.findMany({ orderBy: { userLimit: "asc" } }),
    prisma.tempChannel.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
  ]);

  const nameById = new Map(channels.map((c) => [c.channelId, c.name]));
  const triggerRows: TriggerRow[] = triggers.map((t) => ({
    channelId: t.channelId,
    channelName: nameById.get(t.channelId) ?? null,
    userLimit: t.userLimit,
    nameTemplate: t.nameTemplate,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Utility</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Temp-Voice-Channels</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Join-to-Create: User joint einen Trigger-Channel, Bot legt ihm einen eigenen Voice-Channel
          mit dem dort konfigurierten Limit an. Sobald der Channel leer ist, wird er gelöscht.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
          </svg>
        }
        title="Temp-Channels"
        status={
          config.tempChannelEnabled
            ? `${triggers.length} Trigger · ${active.length} ${active.length === 1 ? "Channel" : "Channels"} aktiv`
            : "Feature deaktiviert"
        }
        active={config.tempChannelEnabled}
        tone="emerald"
        stats={[
          { label: "Trigger-Channels", value: triggers.length },
          { label: "Live", value: active.length, sublabel: active.length === 1 ? "Channel" : "Channels" },
          {
            label: "Kategorie",
            value: config.tempChannelCategoryId
              ? nameById.get(config.tempChannelCategoryId) ?? "—"
              : "Trigger-Cat.",
            sublabel: config.tempChannelCategoryId ? undefined : "Default",
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
              <TempChannelForm
                initial={{
                  tempChannelEnabled: config.tempChannelEnabled,
                  tempChannelCategoryId: config.tempChannelCategoryId,
                  tempChannelNameTemplate: config.tempChannelNameTemplate,
                }}
                triggers={triggerRows}
                channels={channels.map((c) => ({
                  channelId: c.channelId,
                  name: c.name,
                  type: c.type,
                  parentId: c.parentId,
                  position: c.position,
                }))}
              />
            ),
          },
          {
            key: "active",
            label: "Aktive Channels",
            count: active.length,
            content: (
              <section className="card p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Aktuell aktive Temp-Channels</h2>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      Live-Liste aus der DB. Wird gelöscht sobald der Channel leer ist.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-300">
                    {active.length}
                  </span>
                </div>
                {active.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H2v6h4l5 4V5z" />
                      <path d="M23 9l-6 6M17 9l6 6" />
                    </svg>
                    <span>Aktuell keine Temp-Channels offen.</span>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {active.map((t) => {
                      const channelName = nameById.get(t.channelId);
                      return (
                        <li
                          key={t.channelId}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg-elevated/40 px-4 py-3"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                              </svg>
                            </span>
                            <span className="font-medium text-ink">{channelName ?? "—"}</span>
                            <span className="font-mono text-[11px] text-ink-subtle">{t.channelId}</span>
                          </div>
                          <span className="text-xs text-ink-muted">
                            Owner: <span className="font-mono text-ink">{t.ownerId}</span>
                          </span>
                        </li>
                      );
                    })}
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
