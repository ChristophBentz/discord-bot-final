import { prisma } from "@repo/db";
import { CommandsManager, type CommandSummary } from "./CommandsManager";

export default async function CommandsPage() {
  const [commands, roles] = await Promise.all([
    prisma.customCommand.findMany({ orderBy: { name: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
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
    <div className="mx-auto max-w-5xl space-y-6">
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

      <CommandsManager
        commands={summaries}
        roles={roles.map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }))}
        roleMap={Object.fromEntries(
          Array.from(roleMap.entries()).map(([id, r]) => [id, { name: r.name, color: r.color }]),
        )}
      />
    </div>
  );
}
