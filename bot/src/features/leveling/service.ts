import { prisma, type LevelUser } from "@repo/db";

// XP-Formel (MEE6-ähnlich): pro Level steigt der Bedarf quadratisch.
// xp benötigt, um von Level n auf n+1 zu kommen.
export function xpForNextLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

// Gesamt-XP, die nötig waren, um Level n zu erreichen.
export function totalXpForLevel(targetLevel: number): number {
  let total = 0;
  for (let l = 0; l < targetLevel; l++) total += xpForNextLevel(l);
  return total;
}

// Aus Gesamt-XP das aktuelle Level + Fortschritt im Level berechnen.
export function progressFromXp(totalXp: number): {
  level: number;
  xpInLevel: number;
  xpToNext: number;
} {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level += 1;
  }
  return { level, xpInLevel: remaining, xpToNext: xpForNextLevel(level) };
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
  const existing = await prisma.levelUser.findUnique({ where: { userId } });
  const oldLevel = existing?.level ?? 0;
  const newTotalXp = (existing?.xp ?? 0) + amount;
  const { level: newLevel } = progressFromXp(newTotalXp);

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
