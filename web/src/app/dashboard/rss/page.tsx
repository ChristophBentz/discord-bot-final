import { getConfig, prisma } from "@repo/db";
import { FeedManager } from "./FeedManager";

export default async function RssPage() {
  const [config, feeds, channels, roles] = await Promise.all([
    getConfig(),
    prisma.rssFeed.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Utility</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">RSS-Feeds</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Beliebige RSS- oder Atom-Feeds in Discord-Channels posten lassen — News-Sites, Blogs,
          YouTube-Kanäle, Reddit, alles was einen Feed anbietet. Pro Feed eigener Channel,
          Poll-Intervall und optional eine Ping-Rolle.
        </p>
      </header>

      <FeedManager
        feeds={feeds.map((f) => ({
          id: f.id,
          name: f.name,
          url: f.url,
          channelId: f.channelId,
          pingRoleId: f.pingRoleId,
          intervalMin: f.intervalMin,
          enabled: f.enabled,
          lastCheck: f.lastCheck ? f.lastCheck.toISOString() : null,
          lastError: f.lastError,
        }))}
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
    </div>
  );
}
