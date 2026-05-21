export interface ChannelRow {
  channelId: string;
  name: string;
  messages: number;
}

// Farbpalette für die Bars — rotiert durch die Liste.
const COLORS = [
  "#a855f7", // brand purple
  "#ec4899", // pink
  "#22d3ee", // cyan
  "#fbbf24", // amber
  "#4ade80", // green
];

export function FavoriteChannels({ channels }: { channels: ChannelRow[] }) {
  if (channels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-8 text-center text-sm text-ink-muted">
        Diese Woche noch keine Nachrichten in trackbaren Channeln.
      </div>
    );
  }
  const max = channels[0]!.messages; // sortiert: erstes Element hat das Maximum

  return (
    <ul className="space-y-3">
      {channels.map((c, i) => {
        const color = COLORS[i % COLORS.length]!;
        const ratio = max > 0 ? Math.max(0.04, c.messages / max) : 0;
        return (
          <li key={c.channelId} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">
                <span className="text-ink-subtle">#</span> {c.name}
              </span>
              <span className="shrink-0 font-mono text-xs text-ink-muted">
                {c.messages.toLocaleString("de-DE")} msg
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${ratio * 100}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 12px ${color}55`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
