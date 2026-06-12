import { getConfig, prisma } from "@repo/db";
import { LoggingForm } from "./LoggingForm";

export default async function LoggingPage() {
  const [c, channels] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Moderation</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Logging</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Wähle einen Channel, in den der Bot Ereignisse loggt — und entscheide pro Kategorie, was protokolliert wird.
        </p>
      </header>

      <section className="card p-6">
        <LoggingForm
          initial={{
            logChannelId: c.logChannelId,
            logMessageDelete: c.logMessageDelete,
            logMessageEdit: c.logMessageEdit,
            logMemberJoin: c.logMemberJoin,
            logMemberLeave: c.logMemberLeave,
            logMemberBan: c.logMemberBan,
            logMemberUnban: c.logMemberUnban,
            logMemberNickname: c.logMemberNickname,
            logMemberRoles: c.logMemberRoles,
            logVoice: c.logVoice,
            logModeration: c.logModeration,
            logChannels: c.logChannels,
            logServerRoles: c.logServerRoles,
            logServer: c.logServer,
            logInvites: c.logInvites,
            logEmojis: c.logEmojis,
            recordModEvents: c.recordModEvents,
          }}
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
