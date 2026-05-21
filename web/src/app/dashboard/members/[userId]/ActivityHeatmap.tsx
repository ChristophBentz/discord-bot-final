export interface ActivityCell {
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  messages: number;
  voiceSeconds: number;
}

const DAYS = 30;

// 5 Tageszeit-Buckets, summieren auf 24h.
const BUCKETS: Array<{ name: string; hours: number[] }> = [
  { name: "Nacht", hours: [0, 1, 2, 3, 4, 5] },
  { name: "Vormittag", hours: [6, 7, 8, 9, 10] },
  { name: "Mittag", hours: [11, 12, 13, 14, 15] },
  { name: "Nachmittag", hours: [16, 17, 18, 19, 20] },
  { name: "Abend", hours: [21, 22, 23] },
];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateDE(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function score(messages: number, voiceMinutes: number): number {
  return messages + Math.floor(voiceMinutes * 0.5);
}

function colorClass(s: number): string {
  if (s === 0) return "bg-bg-elevated";
  if (s <= 2) return "bg-brand/25";
  if (s <= 8) return "bg-brand/45";
  if (s <= 20) return "bg-brand/70";
  return "bg-brand";
}

export function ActivityHeatmap({ cells }: { cells: ActivityCell[] }) {
  // Hashmap: date+hour -> Daten
  const byKey = new Map<string, ActivityCell>();
  for (const c of cells) byKey.set(`${c.date}|${c.hour}`, c);

  // 30 Spalten von links (vor 29 Tagen) bis rechts (heute)
  const today = new Date();
  const dates: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(dateKey(d));
  }

  // 5 Reihen × 30 Spalten an aggregierten Werten
  const matrix = BUCKETS.map((bucket) =>
    dates.map((date) => {
      let messages = 0;
      let voiceSeconds = 0;
      for (const h of bucket.hours) {
        const c = byKey.get(`${date}|${h}`);
        if (c) {
          messages += c.messages;
          voiceSeconds += c.voiceSeconds;
        }
      }
      const voiceMinutes = Math.floor(voiceSeconds / 60);
      return { date, bucket: bucket.name, messages, voiceMinutes, s: score(messages, voiceMinutes) };
    }),
  );

  const totalMessages = cells.reduce((sum, c) => sum + c.messages, 0);
  const totalVoiceMinutes = Math.floor(cells.reduce((sum, c) => sum + c.voiceSeconds, 0) / 60);

  return (
    <div className="space-y-3">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}
      >
        {matrix.map((row, rowIndex) =>
          row.map((cell) => {
            const title =
              cell.s === 0
                ? `${formatDateDE(cell.date)} · ${cell.bucket} — keine Aktivität`
                : `${formatDateDE(cell.date)} · ${cell.bucket}: ${cell.messages} Nachrichten, ${cell.voiceMinutes}m Voice`;
            return (
              <div
                key={`${rowIndex}-${cell.date}`}
                title={title}
                className={`aspect-square rounded-[3px] ${colorClass(cell.s)} transition-all hover:scale-[1.6] hover:ring-1 hover:ring-brand/60`}
              />
            );
          }),
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-subtle">
        <span>
          vor {DAYS} Tagen
          <span className="mx-2 text-ink-subtle">·</span>
          <span className="text-ink-muted">
            {totalMessages.toLocaleString("de-DE")} Nachrichten, {Math.floor(totalVoiceMinutes / 60)}h Voice
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          Weniger
          <span className="h-2.5 w-2.5 rounded-[3px] bg-bg-elevated" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-brand/25" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-brand/45" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-brand/70" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-brand" />
          Mehr
        </span>
        <span>heute</span>
      </div>
    </div>
  );
}
