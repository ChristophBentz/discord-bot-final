import { getConfig, prisma } from "@repo/db";
import { TempChannelForm } from "./TempChannelForm";
import type { TriggerRow } from "./TriggerEditor";

export default async function TempChannelsPage() {
  const [config, triggers, active, channels] = await Promise.all([
    getConfig(),
    prisma.tempChannelTrigger.findMany({ orderBy: { userLimit: "asc" } }),
    prisma.tempChannel.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
  ]);

  const nameById = new Map(channels.map((c) => [c.channelId, c.name]));
  const triggerRows: TriggerRow[] = triggers.map((t) => ({
    channelId: t.channelId,
    channelName: nameById.get(t.channelId) ?? null,
    userLimit: t.userLimit,
    nameTemplate: t.nameTemplate,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">Utility</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Temp-Voice-Channels</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Join-to-Create: User joint einen Trigger-Channel, Bot legt ihm einen eigenen Voice-Channel
          mit dem dort konfigurierten Limit an. Sobald der Channel leer ist, wird er gelöscht.
        </p>
      </header>

      <TempChannelForm
        initial={{
          tempChannelEnabled: config.tempChannelEnabled,
          tempChannelCategoryId: config.tempChannelCategoryId,
          tempChannelNameTemplate: config.tempChannelNameTemplate,
        }}
        triggers={triggerRows}
        channels={channels.map((c) => ({
          channelId: c.channelId,
          name: c.name,
          type: c.type,
          parentId: c.parentId,
          position: c.position,
        }))}
      />

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aktuell aktive Temp-Channels</h2>
          <span className="badge">{active.length}</span>
        </div>
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-6 text-center text-sm text-ink-muted">
            Aktuell sind keine Temp-Channels offen.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {active.map((t) => (
              <li
                key={t.channelId}
                className="flex items-center justify-between rounded-lg border border-line bg-bg-elevated/40 px-3 py-2 text-sm"
              >
                <span className="font-mono text-ink">#{t.channelId}</span>
                <span className="text-xs text-ink-muted">
                  Owner: <span className="font-mono">{t.ownerId}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
