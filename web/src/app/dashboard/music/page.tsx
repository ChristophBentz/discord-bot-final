import { getConfig, prisma } from "@/lib/db";
import { MusicForm } from "./MusicForm";
import { DjRoleEditor, type DjRoleOption } from "./DjRoleEditor";
import { PlayerPanel } from "./PlayerPanel";
import { DashboardTabs } from "@/components/DashboardTabs";

export default async function MusicPage() {
  const [config, djRows, allRoles] = await Promise.all([
    getConfig(),
    prisma.musicRole.findMany({ select: { roleId: true } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
  ]);

  const roleById = new Map(allRoles.map((r) => [r.roleId, r]));
  const djRoles: DjRoleOption[] = djRows
    .map((r) => roleById.get(r.roleId))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }));
  const availableRoles: DjRoleOption[] = allRoles.map((r) => ({
    roleId: r.roleId,
    name: r.name,
    color: r.color,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Utility</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Musik</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Spiele Musik aus YouTube, Spotify oder SoundCloud in Voice-Channels.
          Steuerung über Slash-Commands (<code>/play</code>, <code>/skip</code>, …) oder hier im Dashboard.
        </p>
      </header>

      <DashboardTabs
        defaultTab="player"
        items={[
          {
            key: "player",
            label: "Player",
            content: <PlayerPanel enabled={config.musicEnabled} />,
          },
          {
            key: "settings",
            label: "Einstellungen",
            content: (
              <section className="card p-6">
                <h2 className="mb-1 text-lg font-semibold">Einstellungen</h2>
                <p className="mb-5 text-sm text-ink-muted">Hauptschalter für das Music-Feature.</p>
                <MusicForm initial={{ musicEnabled: config.musicEnabled }} />
              </section>
            ),
          },
          {
            key: "dj",
            label: "DJ-Rollen",
            content: (
              <section className="card p-6">
                <h2 className="mb-1 text-lg font-semibold">DJ-Rollen</h2>
                <p className="mb-5 text-sm text-ink-muted">
                  Nur User mit einer dieser Rollen dürfen Musik abspielen oder steuern. Leere Liste =
                  niemand darf steuern.
                </p>
                <DjRoleEditor current={djRoles} available={availableRoles} />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
