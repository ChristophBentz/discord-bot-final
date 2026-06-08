import { getConfig, prisma } from "@repo/db";
import { AiSettingsForm } from "./AiSettingsForm";
import { getAiStats } from "./actions";

export default async function AiPage() {
  const [config, channels, stats] = await Promise.all([
    getConfig(),
    prisma.guildChannel.findMany({ orderBy: { position: "asc" } }),
    getAiStats(),
  ]);

  const ICONS: Record<string, string> = {
    image: "🖼️",
    chat: "💬",
    tts: "🎙️",
    music: "🎵",
    video: "🎬",
  };
  const LABELS: Record<string, string> = {
    image: "Bild",
    chat: "Chat",
    tts: "TTS",
    music: "Musik",
    video: "Video",
  };
  const COMMANDS = ["image", "chat", "tts", "music", "video"] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-brand">
          Engagement
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">AI</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          KI-Features: Bilder, Chat, TTS, Musik, Video. Jedes einzeln
          aktivierbar — eigener Channel, eigene Limits.
        </p>
      </header>

      {/* Usage-Übersicht */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {COMMANDS.map((c) => (
          <div key={c} className="rounded-lg border border-line bg-bg-card p-3 text-center">
            <div className="text-lg">{ICONS[c]}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-subtle">
              {LABELS[c]}
            </div>
            <div className="mt-0.5 text-base font-semibold tabular-nums text-ink">
              {stats.last24h[c] ?? 0}
            </div>
            <div className="text-[10px] text-ink-subtle">heute</div>
          </div>
        ))}
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
