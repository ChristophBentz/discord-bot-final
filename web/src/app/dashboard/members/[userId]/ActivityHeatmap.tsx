"use client";

import { useState } from "react";

export interface ActivityCell {
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  messages: number;
  voiceSeconds: number;
}

const DAYS = 30;

const BUCKETS: Array<{ name: string; short: string; hours: number[] }> = [
  { name: "Nacht", short: "00–05", hours: [0, 1, 2, 3, 4, 5] },
  { name: "Vormittag", short: "06–10", hours: [6, 7, 8, 9, 10] },
  { name: "Mittag", short: "11–15", hours: [11, 12, 13, 14, 15] },
  { name: "Nachmittag", short: "16–20", hours: [16, 17, 18, 19, 20] },
  { name: "Abend", short: "21–23", hours: [21, 22, 23] },
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

function shortDateDE(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
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

interface Cell {
  date: string;
  bucket: string;
  messages: number;
  voiceMinutes: number;
  s: number;
}

export function ActivityHeatmap({ cells }: { cells: ActivityCell[] }) {
  const [hover, setHover] = useState<{ row: number; col: number; cell: Cell } | null>(null);

  const byKey = new Map<string, ActivityCell>();
  for (const c of cells) byKey.set(`${c.date}|${c.hour}`, c);

  const today = new Date();
  const dates: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(dateKey(d));
  }

  const matrix: Cell[][] = BUCKETS.map((bucket) =>
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

  // X-Achsen-Labels: alle 5 Tage einen anzeigen + heute
  const dateLabels: Array<{ idx: number; label: string }> = [];
  for (let i = 0; i < DAYS; i += 5) {
    dateLabels.push({ idx: i, label: shortDateDE(dates[i]!) });
  }
  if (dateLabels[dateLabels.length - 1]?.idx !== DAYS - 1) {
    dateLabels.push({ idx: DAYS - 1, label: "heute" });
  }

  return (
    <div className="space-y-3">
      {/* Grid mit Row-Labels links */}
      <div className="flex gap-2">
        <div className="flex flex-col justify-around py-0.5 text-[10px] text-ink-subtle">
          {BUCKETS.map((b) => (
            <div key={b.name} className="leading-none" title={`Stunden ${b.short}`}>
              {b.name}
            </div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}
          >
            {matrix.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isHovered = hover?.row === rowIndex && hover?.col === colIndex;
                return (
                  <div
                    key={`${rowIndex}-${cell.date}`}
                    onMouseEnter={() => setHover({ row: rowIndex, col: colIndex, cell })}
                    onMouseLeave={() => setHover(null)}
                    className={`aspect-square cursor-pointer rounded-[3px] ${colorClass(
                      cell.s,
                    )} transition-shadow ${
                      isHovered ? "shadow-glow ring-2 ring-brand" : "hover:ring-1 hover:ring-line-strong"
                    }`}
                  />
                );
              }),
            )}
          </div>

          {/* X-Achsen-Labels */}
          <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}>
            {Array.from({ length: DAYS }).map((_, i) => {
              const label = dateLabels.find((d) => d.idx === i);
              return (
                <div key={i} className="text-center text-[9px] text-ink-subtle">
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          {/* Tooltip — schwebt über dem Grid, an der Hover-Position */}
          {hover && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-bg-card px-3 py-2 text-xs shadow-card-lg"
              style={{
                left: `${((hover.col + 0.5) / DAYS) * 100}%`,
                top: `calc(${(hover.row / BUCKETS.length) * 100}% - 4rem)`,
              }}
            >
              <div className="font-semibold text-ink">
                {formatDateDE(hover.cell.date)} · {hover.cell.bucket}
              </div>
              {hover.cell.s === 0 ? (
                <div className="mt-0.5 italic text-ink-subtle">Keine Aktivität</div>
              ) : (
                <div className="mt-1 flex flex-col gap-0.5 text-ink-muted">
                  <div>
                    <span className="text-ink">{hover.cell.messages}</span> Nachrichten
                  </div>
                  <div>
                    <span className="text-ink">{hover.cell.voiceMinutes}</span> Minuten Voice
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-subtle">
        <span>
          letzte {DAYS} Tage
          <span className="mx-2">·</span>
          <span className="text-ink-muted">
            {totalMessages.toLocaleString("de-DE")} Nachrichten,{" "}
            {Math.floor(totalVoiceMinutes / 60)}h Voice
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
      </div>
    </div>
  );
}
