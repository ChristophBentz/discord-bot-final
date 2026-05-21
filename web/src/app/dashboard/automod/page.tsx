import { getConfig, prisma } from "@repo/db";
import {
  AddWordForm,
  SettingsForm,
  WordList,
  type WordRow,
} from "./AutoModForms";
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

  const rows: WordRow[] = words.map((w) => ({
    id: w.id,
    word: w.word,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Moderation</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">AutoMod · Wortfilter</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Nachrichten mit gelisteten Wörtern werden automatisch gelöscht. Funktioniert nicht für
          Bots oder Channels, in denen der Bot keine Lösch-Permission hat.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">Einstellungen</h2>
        <p className="mb-5 text-sm text-ink-muted">
          Verhalten beim Filter-Treffer.
        </p>
        <SettingsForm
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
          inviteWhitelist={inviteRows}
          excludedChannels={excludedRows}
          allChannels={allChannels}
          bypassRoles={bypassRoles}
          availableRoles={availableRoles}
        />
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">Wort hinzufügen</h2>
        <p className="mb-5 text-sm text-ink-muted">
          Wird in lowercase gespeichert und Substring-matched.
        </p>
        <AddWordForm />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Wortliste</h2>
          <span className="badge">{rows.length}</span>
        </div>
        <WordList words={rows} />
      </section>
    </div>
  );
}
