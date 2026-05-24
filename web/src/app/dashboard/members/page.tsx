import { prisma } from "@repo/db";
import { MembersTable, type MemberRow, type RoleOption } from "./MembersTable";

export default async function MembersPage() {
  const [members, roles, levelUsers] = await Promise.all([
    prisma.member.findMany({
      where: { inServer: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
    prisma.levelUser.findMany(),
  ]);

  const rolesById = new Map(roles.map((r) => [r.roleId, r]));
  const levelById = new Map(levelUsers.map((l) => [l.userId, l]));

  // Pro Rolle: wie viele Member tragen sie
  const roleMemberCounts = new Map<string, number>();
  for (const m of members) {
    const ids = m.roleIds ? m.roleIds.split(",").filter(Boolean) : [];
    for (const id of ids) {
      roleMemberCounts.set(id, (roleMemberCounts.get(id) ?? 0) + 1);
    }
  }
  const allRoles: RoleOption[] = roles
    .filter((r) => (roleMemberCounts.get(r.roleId) ?? 0) > 0)
    .map((r) => ({
      id: r.roleId,
      name: r.name,
      color: r.color,
      memberCount: roleMemberCounts.get(r.roleId) ?? 0,
    }));

  const rows: MemberRow[] = members.map((m) => {
    const memberRoleIds = m.roleIds ? m.roleIds.split(",").filter(Boolean) : [];
    // Höchste Rolle zuerst (sortiert nach position descending).
    const topRoles = memberRoleIds
      .map((id) => rolesById.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.roleId, name: r.name, color: r.color }));

    const level = levelById.get(m.userId);

    return {
      userId: m.userId,
      displayName: m.displayName,
      username: m.username,
      avatarUrl: m.avatarUrl,
      joinedAt: m.joinedAt?.toISOString() ?? null,
      topRoles,
      roleIds: memberRoleIds,
      isBot: m.isBot,
      level: level?.level ?? 0,
      xp: level?.xp ?? 0,
      messageCount: level?.messageCount ?? 0,
      voiceSeconds: level?.voiceSeconds ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Server</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mitglieder</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Alle Mitglieder deines Servers — klick auf einen Eintrag für Details.
        </p>
      </header>

      <MembersTable rows={rows} allRoles={allRoles} />
    </div>
  );
}
