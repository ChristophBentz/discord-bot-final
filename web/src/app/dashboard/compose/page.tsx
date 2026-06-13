import { getConfig, prisma } from "@/lib/db";
import { DashboardTabs } from "@/components/DashboardTabs";
import { ComposeForm } from "./ComposeForm";
import { MessageHistory, type MessageRow } from "./MessageHistory";

export default async function ComposePage() {
  const [config, channels, roles, history] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    prisma.guildRole.findMany({ orderBy: { position: "desc" } }),
    prisma.botMessage.findMany({ orderBy: { sentAt: "desc" }, take: 20 }),
  ]);

  const guildId = process.env.DISCORD_GUILD_ID ?? "";

  const channelNameById = new Map(channels.map((c) => [c.channelId, c.name]));
  const rows: MessageRow[] = history.map((m) => ({
    id: m.id,
    channelId: m.channelId,
    channelName: channelNameById.get(m.channelId) ?? null,
    messageId: m.messageId,
    type: m.type as MessageRow["type"],
    content: m.content,
    embed: m.embedJson ? (JSON.parse(m.embedJson) as MessageRow["embed"]) : null,
    pollQuestion: m.pollJson
      ? ((JSON.parse(m.pollJson) as { question?: string }).question ?? null)
      : null,
    fileName: m.fileName,
    sentAt: m.sentAt.toISOString(),
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Utility</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Nachrichten senden</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Sende Text, Embeds, Umfragen oder Datei-Anhänge über den Bot in beliebige Channels.
          Gesendete Text/Embed-Nachrichten kannst du nachträglich bearbeiten oder löschen.
        </p>
      </header>

      <DashboardTabs
        defaultTab="compose"
        items={[
          {
            key: "compose",
            label: "Nachricht senden",
            content: (
              <section className="card p-6">
                <ComposeForm
                  channels={channels.map((c) => ({
                    channelId: c.channelId,
                    name: c.name,
                    type: c.type,
                    parentId: c.parentId,
                    position: c.position,
                  }))}
                  bot={{ name: config.botName ?? "Bot", avatarUrl: config.botAvatarUrl }}
                  roles={roles.map((r) => ({
                    roleId: r.roleId,
                    name: r.name,
                    color: r.color,
                  }))}
                />
              </section>
            ),
          },
          {
            key: "history",
            label: "Verlauf",
            count: rows.length,
            content: (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Verlauf</h2>
                  <span className="badge">{rows.length}</span>
                </div>
                <MessageHistory messages={rows} guildId={guildId} />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
