export interface DailyPoint {
  date: string; // YYYY-MM-DD
  messages: number;
  voiceMinutes: number;
}

function formatDateDE(iso: string): string {
  const parts = iso.split("-");
  const d = parts[2] ?? "";
  const m = parts[1] ?? "";
  return `${d}.${m}.`;
}

export function DailyChart({ points }: { points: DailyPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-10 text-center text-sm text-ink-muted">
        Keine Aktivitätsdaten vorhanden.
      </div>
    );
  }
  const maxMessages = Math.max(1, ...points.map((p) => p.messages));
  const maxVoice = Math.max(1, ...points.map((p) => p.voiceMinutes));

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-px h-32">
        {points.map((p) => {
          const msgPct = (p.messages / maxMessages) * 100;
          const voicePct = (p.voiceMinutes / maxVoice) * 100;
          return (
            <div
              key={p.date}
              className="group relative flex flex-1 flex-col items-stretch justify-end"
              title={`${formatDateDE(p.date)}: ${p.messages} Nachrichten · ${Math.round(p.voiceMinutes)} Min Voice`}
            >
              <div
                className="bg-brand transition-all group-hover:bg-brand-light"
                style={{ height: `${Math.max(2, msgPct)}%` }}
              />
              <div
                className="bg-emerald-500/50"
                style={{ height: `${Math.max(0, voicePct * 0.3)}%` }}
              />
              <div className="absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-bg-elevated px-2 py-1 text-[10px] text-ink shadow group-hover:block">
                {formatDateDE(p.date)}: {p.messages} msg · {Math.round(p.voiceMinutes)} min voice
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-ink-subtle">
        <span>{formatDateDE(points[0]?.date ?? "")}</span>
        <span>{formatDateDE(points[Math.floor(points.length / 2)]?.date ?? "")}</span>
        <span>{formatDateDE(points[points.length - 1]?.date ?? "")}</span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-brand" />
          Nachrichten
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-emerald-500/50" />
          Voice-Minuten (skaliert)
        </span>
      </div>
    </div>
  );
}
