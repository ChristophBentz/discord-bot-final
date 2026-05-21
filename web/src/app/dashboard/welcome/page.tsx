import { getConfig, prisma } from "@repo/db";
import { WelcomeForm } from "./WelcomeForm";
import type { AutoRoleOption } from "./AutoRoleEditor";

export default async function WelcomePage() {
  const [config, autoRoles, allRoles, channels] = await Promise.all([
    getConfig(),
    prisma.autoRole.findMany({ select: { roleId: true } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
  ]);

  const allById = new Map(allRoles.map((r) => [r.roleId, r]));
  const currentAutoRoles: AutoRoleOption[] = autoRoles
    .map((a) => allById.get(a.roleId))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }));

  const availableRoles: AutoRoleOption[] = allRoles.map((r) => ({
    roleId: r.roleId,
    name: r.name,
    color: r.color,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Engagement</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Begrüße neue Mitglieder, verabschiede die, die gehen, und vergib Rollen automatisch beim
          Beitritt.
        </p>
      </header>

      <section className="card p-6">
        <WelcomeForm
          initial={{
            welcomeEnabled: config.welcomeEnabled,
            welcomeChannelId: config.welcomeChannelId,
            welcomeMessage: config.welcomeMessage,
            leaveEnabled: config.leaveEnabled,
            leaveChannelId: config.leaveChannelId,
            leaveMessage: config.leaveMessage,
            autoRolesEnabled: config.autoRolesEnabled,
          }}
          currentAutoRoles={currentAutoRoles}
          availableRoles={availableRoles}
          channels={channels.map((c) => ({
            channelId: c.channelId,
            name: c.name,
            type: c.type,
            parentId: c.parentId,
            position: c.position,
          }))}
        />
      </section>
    </div>
  );
}
