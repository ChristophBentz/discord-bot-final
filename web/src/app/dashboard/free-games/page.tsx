import { getConfig, prisma } from "@repo/db";
import { FreeGamesForm } from "./FreeGamesForm";
import { PostHistory } from "./PostHistory";

export default async function FreeGamesPage() {
  const [config, channels, roles, recentPosts] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
    prisma.freeGamePost.findMany({
      orderBy: { postedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Utility</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Free Games</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Bot prüft regelmäßig kostenlose Spiele und Aktionen (Epic, Steam, GOG, Konsolen) via{" "}
          <a
            href="https://www.gamerpower.com/api"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink"
          >
            GamerPower-API
          </a>{" "}
          und postet sie automatisch in den ausgewählten Channel.
        </p>
      </header>

      <section className="card p-6">
        <FreeGamesForm
          initial={{
            freeGamesEnabled: config.freeGamesEnabled,
            freeGamesChannelId: config.freeGamesChannelId,
            freeGamesEpic: config.freeGamesEpic,
            freeGamesSteam: config.freeGamesSteam,
            freeGamesGog: config.freeGamesGog,
            freeGamesConsole: config.freeGamesConsole,
            freeGamesIncludeGames: config.freeGamesIncludeGames,
            freeGamesIncludeDlc: config.freeGamesIncludeDlc,
            freeGamesIncludeLoot: config.freeGamesIncludeLoot,
            freeGamesMessage: config.freeGamesMessage,
            freeGamesPingRoleId: config.freeGamesPingRoleId,
            freeGamesFooterText: config.freeGamesFooterText,
            freeGamesLastCheck: config.freeGamesLastCheck,
          }}
          channels={channels.map((c) => ({
            channelId: c.channelId,
            name: c.name,
            type: c.type,
            parentId: c.parentId,
            position: c.position,
          }))}
          roles={roles.map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }))}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Zuletzt gepostet</h2>
          <span className="badge">{recentPosts.length}</span>
        </div>
        <PostHistory
          posts={recentPosts.map((p) => ({
            giveawayId: p.giveawayId,
            title: p.title,
            platform: p.platform,
            postedAt: p.postedAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
