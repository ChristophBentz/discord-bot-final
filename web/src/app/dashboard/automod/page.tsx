import { getConfig, prisma } from "@repo/db";
import { AutoModManager, type WordRow } from "./AutoModManager";
import type { InviteRow } from "./WhitelistEditor";
import type { ExcludedChannelRow } from "./ExclusionEditor";
import type { BypassRoleOption } from "./BypassRoleEditor";

export default async function AutoModPage() {
  const [config, words, invites, excluded, allChannelsRaw, bypassRows, allRoles] = await Promise.all([
    getConfig(),
    prisma.blacklistedWord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.whitelistedInvite.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.autoModExcludedChannel.findMany({ orderBy: { addedAt: "desc" } }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.autoModBypassRole.findMany({ select: { roleId: true } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
  ]);
  const inviteRows: InviteRow[] = invites.map((i) => ({
    id: i.id,
    guildId: i.guildId,
    guildName: i.guildName,
    note: i.note,
  }));
  const channelNameById = new Map(allChannelsRaw.map((c) => [c.channelId, c.name]));
  const excludedRows: ExcludedChannelRow[] = excluded.map((e) => ({
    channelId: e.channelId,
    name: channelNameById.get(e.channelId) ?? null,
  }));
  const allChannels = allChannelsRaw.map((c) => ({
    channelId: c.channelId,
    name: c.name,
    type: c.type,
    parentId: c.parentId,
    position: c.position,
  }));

  const roleById = new Map(allRoles.map((r) => [r.roleId, r]));
  const bypassRoles: BypassRoleOption[] = bypassRows
    .map((b) => roleById.get(b.roleId))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({ roleId: r.roleId, name: r.name, color: r.color }));
  const availableRoles: BypassRoleOption[] = allRoles.map((r) => ({
    roleId: r.roleId,
    name: r.name,
    color: r.color,
  }));

  const wordRows: WordRow[] = words.map((w) => ({
    id: w.id,
    word: w.word,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Moderation</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">AutoMod</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Automatischer Filter für Spam, Mass-Mentions, verbotene Wörter und Discord-Invites.
          Pro Regel separat ein- und ausschaltbar.
        </p>
      </header>

      <AutoModManager
        initial={{
          autoModEnabled: config.autoModEnabled,
          autoModDM: config.autoModDM,
          autoModBypassMods: config.autoModBypassMods,
          autoModBlockInvites: config.autoModBlockInvites,
          autoModMassMentionEnabled: config.autoModMassMentionEnabled,
          autoModMassMentionLimit: config.autoModMassMentionLimit,
          autoModSpamEnabled: config.autoModSpamEnabled,
          autoModSpamMessages: config.autoModSpamMessages,
          autoModSpamSeconds: config.autoModSpamSeconds,
          autoModSpamTimeoutMinutes: config.autoModSpamTimeoutMinutes,
          autoModExcludedChannelsEnabled: config.autoModExcludedChannelsEnabled,
        }}
        words={wordRows}
        inviteWhitelist={inviteRows}
        excludedChannels={excludedRows}
        allChannels={allChannels}
        bypassRoles={bypassRoles}
        availableRoles={availableRoles}
      />
    </div>
  );
}
