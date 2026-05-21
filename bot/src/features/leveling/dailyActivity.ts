import { prisma } from "@repo/db";

// Lokales Datum als YYYY-MM-DD.
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Delta {
  messages?: number;
  voiceSeconds?: number;
}

// Inkrementiert die aktuelle Stunde des aktuellen Tages.
export async function incrementDailyActivity(userId: string, delta: Delta): Promise<void> {
  const now = new Date();
  const date = dateKey(now);
  const hour = now.getHours();

  await prisma.hourlyActivity.upsert({
    where: { userId_date_hour: { userId, date, hour } },
    update: {
      messages: { increment: delta.messages ?? 0 },
      voiceSeconds: { increment: delta.voiceSeconds ?? 0 },
    },
    create: {
      userId,
      date,
      hour,
      messages: delta.messages ?? 0,
      voiceSeconds: delta.voiceSeconds ?? 0,
    },
  });
}
