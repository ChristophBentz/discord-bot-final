import { getConfig, prisma } from "@repo/db";
import { AiSettingsForm } from "./AiSettingsForm";
import { getAiStats } from "./actions";

export default async function AiPage() {
  const [config, channels, stats] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    getAiStats(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          Engagement
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">AI</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Bilder generieren im Discord via{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5 text-[12px]">/image</code>.
          API-Key, Channel und Limits hier einstellen.
        </p>
      </header>

      {stats.totalImages > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Letzte 24h" value={stats.imagesLast24h.toString()} />
          <Stat label="Letzte 30 Tage" value={stats.imagesLast30d.toString()} />
          <Stat label="Insgesamt" value={stats.totalImages.toString()} />
        </div>
      )}

      <AiSettingsForm
        initial={{
          aiEnabled: config.aiEnabled,
          aiProvider: config.aiProvider,
          aiApiKey: config.aiApiKey ?? "",
          aiGroupId: config.aiGroupId ?? "",
          aiImageChannelId: config.aiImageChannelId ?? "",
          aiImagesPerUserPerDay: config.aiImagesPerUserPerDay,
          aiImageModel: config.aiImageModel,
          aiApiBaseUrl: config.aiApiBaseUrl,
        }}
        channels={channels.map((c) => ({
          channelId: c.channelId,
          name: c.name,
          type: c.type,
        }))}
      />

      {stats.topUsers.length > 0 && (
        <section className="rounded-lg border border-line bg-bg-card p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Top User (30 Tage)
          </h3>
          <ul className="mt-3 divide-y divide-line">
            {stats.topUsers.map((u, i) => (
              <li
                key={u.userId}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-ink-subtle tabular-nums">
                    #{i + 1}
                  </span>
                  <span className="text-ink">{u.displayName ?? u.userId}</span>
                </div>
                <span className="text-ink-muted tabular-nums">{u.count} Bilder</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg-card p-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}
