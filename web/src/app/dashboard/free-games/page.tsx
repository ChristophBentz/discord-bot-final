import { getConfig, prisma } from "@/lib/db";
import { FreeGamesForm } from "./FreeGamesForm";
import { PostHistory } from "./PostHistory";
import { FeatureHero } from "@/components/FeatureHero";
import { DashboardTabs } from "@/components/DashboardTabs";

export default async function FreeGamesPage() {
  const [config, channels, roles, recentPosts, totalPosts] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
    prisma.freeGamePost.findMany({
      orderBy: { postedAt: "desc" },
      take: 10,
    }),
    prisma.freeGamePost.count(),
  ]);
  const activeSources = [
    config.freeGamesEpic,
    config.freeGamesSteam,
    config.freeGamesGog,
    config.freeGamesConsole,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
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

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-6 0v4" />
            <rect x="2" y="9" width="20" height="12" rx="2" />
            <path d="M12 12v.01M8 12v.01M16 12v.01" />
          </svg>
        }
        title="Free Games"
        status={
          config.freeGamesEnabled
            ? `${activeSources}/4 Plattformen · ${totalPosts.toLocaleString("de-DE")} Posts insgesamt`
            : "Feature deaktiviert"
        }
        active={config.freeGamesEnabled}
        tone="emerald"
        stats={[
          { label: "Aktive Plattformen", value: `${activeSources}/4` },
          { label: "Posts gesamt", value: totalPosts.toLocaleString("de-DE") },
          {
            label: "Letzter Check",
            value: config.freeGamesLastCheck
              ? config.freeGamesLastCheck.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
              : "—",
            sublabel: config.freeGamesLastCheck
              ? config.freeGamesLastCheck.toLocaleDateString("de-DE")
              : undefined,
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
                bot={{ name: config.botName ?? "Bot", avatarUrl: config.botAvatarUrl }}
              />
            ),
          },
          {
            key: "history",
            label: "Zuletzt gepostet",
            count: recentPosts.length,
            content: (
              <section className="card p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Zuletzt gepostet</h2>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      Die letzten {recentPosts.length} Free-Games-Posts vom Bot.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-300">
                    {recentPosts.length}
                  </span>
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
            ),
          },
        ]}
      />
    </div>
  );
}
