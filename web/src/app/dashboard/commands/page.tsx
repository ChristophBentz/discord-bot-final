import { getConfig, prisma } from "@/lib/db";
import { FeatureHero } from "@/components/FeatureHero";
import { CommandsManager, type CommandSummary } from "./CommandsManager";

export default async function CommandsPage() {
  const [commands, roles, config] = await Promise.all([
    prisma.customCommand.findMany({ orderBy: { name: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
    getConfig(),
  ]);

  const roleMap = new Map(roles.map((r) => [r.roleId, r]));

  const summaries: CommandSummary[] = commands.map((c) => ({
    name: c.name,
    description: c.description,
    responseType: c.responseType === "embed" ? "embed" : "text",
    response: c.response,
    embedTitle: c.embedTitle,
    embedDescription: c.embedDescription,
    embedColor: c.embedColor,
    embedImageUrl: c.embedImageUrl,
    embedFooter: c.embedFooter,
    ephemeral: c.ephemeral,
    allowedRoleIds: c.allowedRoleIds,
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          Engagement
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Custom Commands</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Eigene Slash-Commands wie{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 text-[12px]">/regeln</code>{" "}
          oder{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 text-[12px]">/discord</code>.
          Änderungen sind sofort live.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4 7 4 4-4 4M12 15h8" />
          </svg>
        }
        title="Custom Commands"
        status={
          commands.length > 0 ? (
            <>{commands.length} Slash-Commands · Änderungen sofort live</>
          ) : (
            "Noch keine Commands angelegt"
          )
        }
        active={commands.length > 0}
        tone="brand"
        stats={[
          { label: "Commands", value: commands.length },
          {
            label: "Mit Embed",
            value: commands.filter((c) => c.responseType === "embed").length,
          },
          {
            label: "Rollenbeschränkt",
            value: commands.filter((c) => c.allowedRoleIds.trim().length > 0).length,
          },
        ]}
      />

      <CommandsManager
        commands={summaries}
        roles={roles.map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }))}
        roleMap={Object.fromEntries(
          Array.from(roleMap.entries()).map(([id, r]) => [id, { name: r.name, color: r.color }]),
        )}
        bot={{
          name: config.botName ?? "Bot",
          avatarUrl: config.botAvatarUrl ?? null,
        }}
      />
    </div>
  );
}
