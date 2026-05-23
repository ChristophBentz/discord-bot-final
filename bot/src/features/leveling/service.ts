import { prisma, type LevelUser } from "@repo/db";

// Curve-Cache: Config-Werte werden aus der DB gelesen, 10s gecached.
export interface LevelCurve {
  base: number; // XP für Level 0→1
  mult: number; // Prozent — z.B. 15 = jedes nächste Level kostet 15% mehr
}

const DEFAULT_CURVE: LevelCurve = { base: 100, mult: 15 };
let _curveCache: { curve: LevelCurve; expiresAt: number } | null = null;
const CURVE_TTL_MS = 10_000;

async function loadCurve(): Promise<LevelCurve> {
  if (_curveCache && Date.now() < _curveCache.expiresAt) return _curveCache.curve;
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  const curve: LevelCurve = {
    base: Math.max(10, config?.xpLevelBase ?? DEFAULT_CURVE.base),
    mult: Math.max(0, Math.min(200, config?.xpLevelMultiplier ?? DEFAULT_CURVE.mult)),
  };
  _curveCache = { curve, expiresAt: Date.now() + CURVE_TTL_MS };
  return curve;
}

export function invalidateLevelCurveCache(): void {
  _curveCache = null;
}

// Synchrone Variante — nimmt die Curve-Params explizit. Wenn nichts übergeben wird,
// fällt's auf den letzten Cache-Wert (oder DEFAULT bei kaltem Start) zurück.
export function xpForNextLevel(level: number, curve?: LevelCurve): number {
  const c = curve ?? _curveCache?.curve ?? DEFAULT_CURVE;
  return Math.round(c.base * Math.pow(1 + c.mult / 100, level));
}

export function totalXpForLevel(targetLevel: number, curve?: LevelCurve): number {
  let total = 0;
  for (let l = 0; l < targetLevel; l++) total += xpForNextLevel(l, curve);
  return total;
}

export function progressFromXp(
  totalXp: number,
  curve?: LevelCurve,
): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 0;
  let remaining = totalXp;
  // Safety-Cap bei 500 Levels — verhindert Endlosschleife bei kaputten Configs
  while (remaining >= xpForNextLevel(level, curve) && level < 500) {
    remaining -= xpForNextLevel(level, curve);
    level += 1;
  }
  return { level, xpInLevel: remaining, xpToNext: xpForNextLevel(level, curve) };
}

// Async-Helper für Stellen die Config eh fetchen wollen.
export async function getLevelCurve(): Promise<LevelCurve> {
  return loadCurve();
}

export interface XpResult {
  user: LevelUser;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
}

export interface AddXpExtras {
  displayName?: string | null;
  messageIncrement?: number;
  voiceSecondsIncrement?: number;
}

// XP hinzufügen, Level neu berechnen und upserten. Optional Counter mitführen.
export async function addXp(
  userId: string,
  amount: number,
  extras: AddXpExtras = {},
): Promise<XpResult> {
  const [existing, curve] = await Promise.all([
    prisma.levelUser.findUnique({ where: { userId } }),
    loadCurve(),
  ]);
  const oldLevel = existing?.level ?? 0;
  const newTotalXp = (existing?.xp ?? 0) + amount;
  const { level: newLevel } = progressFromXp(newTotalXp, curve);

  const user = await prisma.levelUser.upsert({
    where: { userId },
    update: {
      xp: newTotalXp,
      level: newLevel,
      ...(extras.displayName !== undefined ? { displayName: extras.displayName } : {}),
      ...(extras.messageIncrement
        ? { messageCount: { increment: extras.messageIncrement } }
        : {}),
      ...(extras.voiceSecondsIncrement
        ? { voiceSeconds: { increment: extras.voiceSecondsIncrement } }
        : {}),
    },
    create: {
      userId,
      xp: newTotalXp,
      level: newLevel,
      displayName: extras.displayName ?? null,
      messageCount: extras.messageIncrement ?? 0,
      voiceSeconds: extras.voiceSecondsIncrement ?? 0,
    },
  });

  return { user, leveledUp: newLevel > oldLevel, oldLevel, newLevel };
}

// Rang einer User-ID (1 = höchstes XP).
export async function getRank(userId: string): Promise<{
  rank: number;
  total: number;
  user: LevelUser | null;
}> {
  const user = await prisma.levelUser.findUnique({ where: { userId } });
  if (!user) {
    const total = await prisma.levelUser.count();
    return { rank: total + 1, total, user: null };
  }
  // Wie viele User haben mehr XP? Position = das + 1.
  const ahead = await prisma.levelUser.count({ where: { xp: { gt: user.xp } } });
  const total = await prisma.levelUser.count();
  return { rank: ahead + 1, total, user };
}

export async function getLeaderboard(limit = 10): Promise<LevelUser[]> {
  return prisma.levelUser.findMany({
    orderBy: [{ xp: "desc" }],
    take: limit,
  });
}
