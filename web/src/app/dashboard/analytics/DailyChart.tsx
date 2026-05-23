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
  const totalMessages = points.reduce((s, p) => s + p.messages, 0);
  const totalVoice = points.reduce((s, p) => s + p.voiceMinutes, 0);
  const maxMessages = Math.max(1, ...points.map((p) => p.messages));
  const maxVoice = Math.max(1, ...points.map((p) => p.voiceMinutes));

  // Wenn gar nichts → freundliche Empty-State im Chart-Bereich
  if (totalMessages === 0 && totalVoice === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-10 text-center text-sm text-ink-muted">
        Im gewählten Zeitraum noch keine Aktivität getrackt.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Chart-Bereich mit relativen Y-Achsen-Markierungen */}
      <div className="relative h-40 rounded-lg border border-line bg-bg-elevated/30 p-2">
        {/* Y-Achsen-Gridlines (3 Linien: 0%, 50%, 100%) */}
        <div className="absolute inset-x-2 top-2 border-t border-line/40" />
        <div className="absolute inset-x-2 top-1/2 border-t border-line/40" />
        <div className="absolute inset-x-2 bottom-2 border-t border-line/40" />

        {/* Max-Label oben links */}
        <div className="absolute left-1 top-1 text-[9px] text-ink-subtle">
          {maxMessages.toLocaleString("de-DE")}
        </div>

        <div className="relative flex h-full items-end gap-px">
          {points.map((p) => {
            const msgPct = (p.messages / maxMessages) * 100;
            const voicePct = (p.voiceMinutes / maxVoice) * 100 * 0.3;
            return (
              <div
                key={p.date}
                className="group relative flex h-full flex-1 flex-col justify-end"
                title={`${formatDateDE(p.date)}: ${p.messages} Nachrichten · ${Math.round(p.voiceMinutes)} Min Voice`}
              >
                <div
                  className="rounded-t-sm bg-brand transition-all group-hover:bg-brand-light"
                  style={{
                    height: `${msgPct}%`,
                    minHeight: p.messages > 0 ? "2px" : "0",
                  }}
                />
                <div
                  className="bg-emerald-500/60"
                  style={{
                    height: `${voicePct}%`,
                    minHeight: p.voiceMinutes > 0 ? "2px" : "0",
                  }}
                />
                <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-bg-card px-2 py-1 text-[10px] text-ink shadow-lg group-hover:block">
                  <div className="font-medium">{formatDateDE(p.date)}</div>
                  <div className="text-ink-muted">
                    {p.messages} msg · {Math.round(p.voiceMinutes)} min voice
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-Achse: 3 Datums-Labels */}
      <div className="flex items-center justify-between text-[10px] text-ink-subtle">
        <span>{formatDateDE(points[0]?.date ?? "")}</span>
        <span>{formatDateDE(points[Math.floor(points.length / 2)]?.date ?? "")}</span>
        <span>{formatDateDE(points[points.length - 1]?.date ?? "")}</span>
      </div>

      {/* Legende */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-brand" />
          {totalMessages.toLocaleString("de-DE")} Nachrichten
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-emerald-500/60" />
          {Math.round(totalVoice).toLocaleString("de-DE")} Voice-Minuten
        </span>
      </div>
    </div>
  );
}
