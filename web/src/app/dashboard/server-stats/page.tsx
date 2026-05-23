import { getConfig, prisma } from "@repo/db";
import { ServerStatsManager } from "./ServerStatsManager";

export default async function ServerStatsPage() {
  const [config, stats, channels] = await Promise.all([
    getConfig(),
    prisma.serverStat.findMany({ orderBy: { position: "asc" } }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Info</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Server-Stats</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Locked-Voice-Channels mit Live-Zählerständen oben in der Channel-Liste. Bot legt sie
          selbst an und aktualisiert sie alle 10 Minuten — Discord limitiert Channel-Edits stark.
        </p>
      </header>

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
    </div>
  );
}
