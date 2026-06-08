import { getConfig, prisma } from "@repo/db";
import { AiSettingsForm } from "./AiSettingsForm";
import { getAiStats } from "./actions";

export default async function AiPage() {
  const [config, channels, stats] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    getAiStats(),
  ]);

  const enabled = [
    config.aiEnabled && "image",
    config.aiChatEnabled && "chat",
    config.aiTtsEnabled && "tts",
    config.aiMusicEnabled && "music",
    config.aiVideoEnabled && "video",
  ].filter(Boolean) as string[];

  const totalToday =
    (stats.last24h.image ?? 0) +
    (stats.last24h.chat ?? 0) +
    (stats.last24h.tts ?? 0) +
    (stats.last24h.music ?? 0) +
    (stats.last24h.video ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          Engagement
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">AI</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          KI-Features für Discord — jedes einzeln aktivierbar, eigener Channel, eigene Limits.
        </p>
      </header>

      {/* Inline-Stats — kein Card-Grid */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-y border-line py-3 text-sm">
        <span className="text-ink-muted">
          <span className="font-medium text-ink tabular-nums">{enabled.length}</span> von 5 aktiv
        </span>
        <span className="text-ink-muted">
          <span className="font-medium text-ink tabular-nums">{totalToday}</span> heute
        </span>
        <span className="text-ink-muted">
          <span className="font-medium text-ink tabular-nums">{stats.last24h.image ?? 0}</span> Bilder
        </span>
        <span className="text-ink-muted">
          <span className="font-medium text-ink tabular-nums">{stats.last24h.chat ?? 0}</span> Chats
        </span>
        <span className="text-ink-muted">
          <span className="font-medium text-ink tabular-nums">{stats.last24h.tts ?? 0}</span> TTS
        </span>
      </div>

      <AiSettingsForm
        initial={{
          aiProvider: config.aiProvider,
          aiApiKey: config.aiApiKey ?? "",
          aiGroupId: config.aiGroupId ?? "",
          aiApiBaseUrl: config.aiApiBaseUrl,

          aiEnabled: config.aiEnabled,
          aiImageChannelId: config.aiImageChannelId ?? "",
          aiImagesPerUserPerDay: config.aiImagesPerUserPerDay,
          aiImageModel: config.aiImageModel,

          aiChatEnabled: config.aiChatEnabled,
          aiChatChannelId: config.aiChatChannelId ?? "",
          aiChatPerUserPerDay: config.aiChatPerUserPerDay,
          aiChatModel: config.aiChatModel,

          aiTtsEnabled: config.aiTtsEnabled,
          aiTtsChannelId: config.aiTtsChannelId ?? "",
          aiTtsPerUserPerDay: config.aiTtsPerUserPerDay,
          aiTtsModel: config.aiTtsModel,
          aiTtsVoiceId: config.aiTtsVoiceId,

          aiMusicEnabled: config.aiMusicEnabled,
          aiMusicChannelId: config.aiMusicChannelId ?? "",
          aiMusicPerUserPerDay: config.aiMusicPerUserPerDay,
          aiMusicModel: config.aiMusicModel,

          aiVideoEnabled: config.aiVideoEnabled,
          aiVideoChannelId: config.aiVideoChannelId ?? "",
          aiVideoPerUserPerDay: config.aiVideoPerUserPerDay,
          aiVideoModel: config.aiVideoModel,
        }}
        channels={channels.map((c) => ({
          channelId: c.channelId,
          name: c.name,
          type: c.type,
        }))}
      />
    </div>
  );
}
