import { prisma } from "@repo/db";
import { SelfRolesManager } from "./SelfRolesManager";
import { FeatureHero } from "@/components/FeatureHero";

export default async function SelfRolesPage() {
  const [panels, channels, roles] = await Promise.all([
    prisma.selfRolePanel.findMany({
      orderBy: { createdAt: "asc" },
      include: { options: { orderBy: { position: "asc" } } },
    }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
  ]);

  const activePanels = panels.filter((p) => p.enabled).length;
  const totalRoles = panels.reduce((sum, p) => sum + p.options.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Engagement</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Auto-Rollen</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          User können sich selbst Rollen geben — entweder über Emoji-Reactions, Buttons oder ein
          Dropdown. Pro Panel ein eigener Modus.
        </p>
      </header>

      <FeatureHero
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41a2 2 0 0 1 0 2.83l-5.66 5.66a2 2 0 0 1-2.83 0L2.5 12.3V2.5h9.8l8.29 8.29a2 2 0 0 1 0 2.62z" />
            <circle cx="7" cy="7" r="1.5" />
          </svg>
        }
        title="Self-Assign-Panels"
        status={
          panels.length === 0
            ? "Noch keine Panels"
            : `${activePanels}/${panels.length} aktiv · ${totalRoles} ${totalRoles === 1 ? "Rolle" : "Rollen"} insgesamt`
        }
        active={activePanels > 0}
        tone="purple"
        stats={[
          { label: "Panels gesamt", value: panels.length },
          { label: "Aktiv", value: activePanels },
          { label: "Rollen", value: totalRoles },
        ]}
      />

      <SelfRolesManager
        panels={panels.map((p) => ({
          id: p.id,
          channelId: p.channelId,
          messageId: p.messageId,
          type: p.type as "reaction" | "button" | "dropdown",
          title: p.title,
          description: p.description,
          color: p.color,
          uniqueChoice: p.uniqueChoice,
          enabled: p.enabled,
          options: p.options.map((o) => ({
            id: o.id,
            roleId: o.roleId,
            label: o.label,
            description: o.description,
            emoji: o.emoji,
            buttonStyle: o.buttonStyle,
          })),
        }))}
        channels={channels.map((c) => ({
          channelId: c.channelId,
          name: c.name,
          type: c.type,
          parentId: c.parentId,
          position: c.position,
        }))}
        roles={roles.map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }))}
      />
    </div>
  );
}
