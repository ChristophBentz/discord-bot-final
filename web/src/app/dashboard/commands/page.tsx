import { prisma } from "@repo/db";
import { CommandsManager, type CommandSummary } from "./CommandsManager";
import { FeatureHero } from "@/components/FeatureHero";

export default async function CommandsPage() {
  const [commands, roles] = await Promise.all([
    prisma.customCommand.findMany({ orderBy: { name: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
  ]);

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

  const embedCount = summaries.filter((c) => c.responseType === "embed").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          Engagement
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Custom Commands</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Definiere eigene Slash-Commands wie{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 text-[12px]">/regeln</code>{" "}
          oder{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 text-[12px]">/discord</code>.
          Werden als echte Discord-Commands registriert — inkl. Autocomplete.
          Änderungen propagieren sofort.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4 7 4 4-4 4M12 15h8" />
          </svg>
        }
        title="Slash-Commands"
        tone="purple"
        active={summaries.length > 0}
        status={
          summaries.length === 0
            ? "Noch keine Custom-Commands"
            : `${summaries.length} aktiv${embedCount > 0 ? ` · ${embedCount} Embeds` : ""}`
        }
        stats={[
          { label: "Total", value: summaries.length },
          { label: "Text", value: summaries.length - embedCount },
          { label: "Embed", value: embedCount },
        ]}
      />

      <CommandsManager
        commands={summaries}
        roles={roles.map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }))}
      />
    </div>
  );
}
