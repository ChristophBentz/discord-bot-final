import { getConfig, prisma } from "@/lib/db";
import { ServerStatsManager } from "./ServerStatsManager";
import { DiagnosePanel } from "./DiagnosePanel";
import { FeatureHero } from "@/components/FeatureHero";

export default async function ServerStatsPage() {
  const [config, stats, channels] = await Promise.all([
    getConfig(),
    prisma.serverStat.findMany({ orderBy: { position: "asc" } }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
  ]);

  const enabledStats = stats.filter((s) => s.enabled).length;
  const liveChannels = stats.filter((s) => s.enabled && s.channelId).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Engagement</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Server-Stats</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Locked-Voice-Channels mit Live-Zählerständen oben in der Channel-Liste. Bot legt sie
          selbst an und aktualisiert sie alle 10 Minuten — Discord limitiert Channel-Edits stark.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 5-6" />
          </svg>
        }
        title="Server-Stats"
        status={
          config.serverStatsEnabled ? (
            <>
              <span className="text-emerald-400">{liveChannels}</span> von {enabledStats} Channel
              {enabledStats === 1 ? "" : "s"} live
            </>
          ) : (
            "Feature deaktiviert"
          )
        }
        active={config.serverStatsEnabled}
        tone="emerald"
        stats={[
          { label: "Konfigurierte Stats", value: stats.length },
          { label: "Live-Channels", value: liveChannels },
          { label: "Update-Intervall", value: `${config.serverStatsUpdateMinutes} Min` },
        ]}
      />

      <ServerStatsManager
        initial={{
          serverStatsEnabled: config.serverStatsEnabled,
          serverStatsCategoryId: config.serverStatsCategoryId,
          serverStatsUpdateMinutes: config.serverStatsUpdateMinutes,
        }}
        stats={stats.map((s) => ({
          id: s.id,
          type: s.type,
          nameTemplate: s.nameTemplate,
          channelId: s.channelId,
          enabled: s.enabled,
          lastValue: s.lastValue,
          lastCheck: s.lastCheck ? s.lastCheck.toISOString() : null,
          lastUpdate: s.lastUpdate ? s.lastUpdate.toISOString() : null,
        }))}
        channels={channels.map((c) => ({
          channelId: c.channelId,
          name: c.name,
          type: c.type,
          parentId: c.parentId,
          position: c.position,
        }))}
      />

      <DiagnosePanel />
    </div>
  );
}
