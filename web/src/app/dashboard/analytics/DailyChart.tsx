"use client";

import { useId, useState } from "react";

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

function formatDateLong(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function nice(n: number): string {
  return n.toLocaleString("de-DE");
}

// Smoothe Curve durch Punkte (Catmull-Rom-Spline-Approximation als Bezier-Path)
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  const path = [`M ${points[0]!.x} ${points[0]!.y}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return path.join(" ");
}

export function DailyChart({ points }: { points: DailyPoint[] }) {
  const gradMsgId = useId();
  const gradVoiceId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-10 text-center text-sm text-ink-muted">
        Keine Aktivitätsdaten vorhanden.
      </div>
    );
  }
  const totalMessages = points.reduce((s, p) => s + p.messages, 0);
  const totalVoice = points.reduce((s, p) => s + p.voiceMinutes, 0);
  const peakMessages = Math.max(...points.map((p) => p.messages));
  const peakVoice = Math.max(...points.map((p) => p.voiceMinutes));
  const avgMessages = Math.round(totalMessages / points.length);

  if (totalMessages === 0 && totalVoice === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-bg-elevated/30 px-4 py-10 text-center text-sm text-ink-muted">
        Im gewählten Zeitraum noch keine Aktivität getrackt.
      </div>
    );
  }

  // SVG-Koordinaten
  const W = 1000; // viewBox-Breite, wird per preserveAspectRatio skaliert
  const H = 240;
  const PADDING_L = 40;
  const PADDING_R = 12;
  const PADDING_T = 16;
  const PADDING_B = 28;
  const chartW = W - PADDING_L - PADDING_R;
  const chartH = H - PADDING_T - PADDING_B;

  const maxMsg = Math.max(1, peakMessages);
  const maxVoice = Math.max(1, peakVoice);

  const xFor = (i: number) =>
    PADDING_L + (i / Math.max(1, points.length - 1)) * chartW;
  const yForMsg = (v: number) => PADDING_T + chartH - (v / maxMsg) * chartH;
  const yForVoice = (v: number) => PADDING_T + chartH - (v / maxVoice) * chartH;

  const msgPoints = points.map((p, i) => ({ x: xFor(i), y: yForMsg(p.messages) }));
  const voicePoints = points.map((p, i) => ({ x: xFor(i), y: yForVoice(p.voiceMinutes) }));

  const msgPath = smoothPath(msgPoints);
  const voicePath = smoothPath(voicePoints);
  const baseline = PADDING_T + chartH;
  const msgArea = `${msgPath} L ${xFor(points.length - 1)} ${baseline} L ${xFor(0)} ${baseline} Z`;
  const voiceArea = `${voicePath} L ${xFor(points.length - 1)} ${baseline} L ${xFor(0)} ${baseline} Z`;

  // Y-Tick-Labels (für messages, da das die Primär-Skala ist)
  const yTicks = [maxMsg, Math.round(maxMsg / 2), 0];
  const avgY = yForMsg(avgMessages);

  return (
    <div className="space-y-4">
      {/* Stats-Header */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Nachrichten"
          value={nice(totalMessages)}
          color="text-brand"
        />
        <Stat label="Ø pro Tag" value={nice(avgMessages)} color="text-ink" />
        <Stat label="Spitze" value={nice(peakMessages)} color="text-ink" />
        <Stat
          label="Voice-Min."
          value={nice(Math.round(totalVoice))}
          color="text-emerald-400"
        />
      </div>

      {/* SVG Area-Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-56 w-full"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const svg = e.currentTarget;
            const rect = svg.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * W;
            const idx = Math.round(
              ((x - PADDING_L) / chartW) * Math.max(1, points.length - 1),
            );
            const clamped = Math.max(0, Math.min(points.length - 1, idx));
            setHoverIdx(clamped);
          }}
        >
          <defs>
            <linearGradient id={gradMsgId} x1="0" x2="0" y1="0" y2="1" className="text-brand">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={gradVoiceId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontale Gridlines */}
          {yTicks.map((t, i) => {
            const y = yForMsg(t);
            return (
              <g key={i}>
                <line
                  x1={PADDING_L}
                  x2={W - PADDING_R}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-line"
                  strokeOpacity="0.5"
                  strokeDasharray={i === yTicks.length - 1 ? "0" : "3 3"}
                />
                <text
                  x={PADDING_L - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-current text-ink-subtle"
                  fontSize="11"
                >
                  {nice(t)}
                </text>
              </g>
            );
          })}

          {/* Average-Linie (gestrichelt) */}
          {avgMessages > 0 && (
            <line
              x1={PADDING_L}
              x2={W - PADDING_R}
              y1={avgY}
              y2={avgY}
              stroke="currentColor"
              className="text-brand"
              strokeOpacity="0.4"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )}

          {/* Voice-Area (unter Messages, weniger sichtbar) */}
          <path d={voiceArea} fill={`url(#${gradVoiceId})`} />
          <path d={voicePath} stroke="#10b981" strokeWidth="2" fill="none" strokeOpacity="0.8" />

          {/* Messages-Area (Hauptmetrik) */}
          <path d={msgArea} fill={`url(#${gradMsgId})`} />
          <path d={msgPath} stroke="currentColor" className="text-brand" strokeWidth="2.5" fill="none" />

          {/* Hover-Crosshair + Highlight-Dots */}
          {hoverIdx !== null && (
            <g>
              <line
                x1={xFor(hoverIdx)}
                x2={xFor(hoverIdx)}
                y1={PADDING_T}
                y2={baseline}
                stroke="currentColor"
                className="text-ink-muted"
                strokeOpacity="0.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={xFor(hoverIdx)}
                cy={yForMsg(points[hoverIdx]!.messages)}
                r="5"
                fill="currentColor"
                className="text-brand"
                stroke="#fff"
                strokeWidth="2"
              />
              {points[hoverIdx]!.voiceMinutes > 0 && (
                <circle
                  cx={xFor(hoverIdx)}
                  cy={yForVoice(points[hoverIdx]!.voiceMinutes)}
                  r="4"
                  fill="#10b981"
                  stroke="#fff"
                  strokeWidth="2"
                />
              )}
            </g>
          )}
        </svg>

        {/* Hover-Tooltip — als HTML-Box für saubere Typografie */}
        {hoverIdx !== null && points[hoverIdx] && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-bg-card px-3 py-2 text-xs shadow-xl"
            style={{
              left: `calc(${(xFor(hoverIdx) / W) * 100}% )`,
            }}
          >
            <div className="font-semibold text-ink">
              {formatDateLong(points[hoverIdx]!.date)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-ink-muted">
              <span className="h-2 w-2 rounded-full bg-brand" />
              <span className="tabular-nums">
                {nice(points[hoverIdx]!.messages)} Nachrichten
              </span>
            </div>
            <div className="flex items-center gap-2 text-ink-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="tabular-nums">
                {nice(Math.round(points[hoverIdx]!.voiceMinutes))} Voice-Minuten
              </span>
            </div>
          </div>
        )}
      </div>

      {/* X-Achse */}
      <div className="flex items-center justify-between px-10 text-[11px] text-ink-subtle">
        <span>{formatDateDE(points[0]?.date ?? "")}</span>
        <span>{formatDateDE(points[Math.floor(points.length / 2)]?.date ?? "")}</span>
        <span>{formatDateDE(points[points.length - 1]?.date ?? "")}</span>
      </div>

      {/* Legende */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          Nachrichten
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Voice-Minuten
        </span>
        {avgMessages > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="block h-0.5 w-4 border-t-2 border-dashed border-brand/50" />
            Durchschnitt
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-elevated/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-ink-subtle">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
