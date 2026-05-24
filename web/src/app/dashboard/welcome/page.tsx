import { getConfig, prisma } from "@repo/db";
import { WelcomeForm } from "./WelcomeForm";
import type { AutoRoleOption } from "./AutoRoleEditor";
import { FeatureHero } from "@/components/FeatureHero";

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

  const activeSub = [config.welcomeEnabled, config.leaveEnabled, config.autoRolesEnabled].filter(
    Boolean,
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Engagement</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Begrüße neue Mitglieder, verabschiede die, die gehen, und vergib Rollen automatisch beim
          Beitritt.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6M23 11h-6" />
          </svg>
        }
        title="Welcome-Modul"
        status={
          activeSub > 0 ? (
            <>
              <span className="text-emerald-400">{activeSub}</span> von 3 Sub-Features aktiv
            </>
          ) : (
            "Alle Sub-Features inaktiv"
          )
        }
        active={activeSub > 0}
        tone="emerald"
        stats={[
          {
            label: "Begrüßung",
            value: config.welcomeEnabled ? "An" : "Aus",
          },
          {
            label: "Verabschiedung",
            value: config.leaveEnabled ? "An" : "Aus",
          },
          {
            label: "Auto-Rollen",
            value: config.autoRolesEnabled ? String(currentAutoRoles.length) : "Aus",
            sublabel: config.autoRolesEnabled ? "vergeben" : undefined,
          },
        ]}
      />

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
          bot={{ name: config.botName ?? "Bot", avatarUrl: config.botAvatarUrl }}
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
