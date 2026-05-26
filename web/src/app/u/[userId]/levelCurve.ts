export interface Curve {
  base: number;
  mult: number;
}

export function xpForNextLevel(level: number, c: Curve): number {
  return Math.round(c.base * Math.pow(1 + c.mult / 100, level));
}

export function progressFromXp(
  totalXp: number,
  c: Curve,
): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForNextLevel(level, c) && level < 500) {
    remaining -= xpForNextLevel(level, c);
    level += 1;
  }
  return { level, xpInLevel: remaining, xpToNext: xpForNextLevel(level, c) };
}
