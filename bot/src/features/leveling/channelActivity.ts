import { prisma } from "@repo/db";
import { dateKey } from "./dailyActivity.js";

export async function incrementChannelActivity(
  userId: string,
  channelId: string,
): Promise<void> {
  const date = dateKey();
  await prisma.channelActivity.upsert({
    where: { userId_channelId_date: { userId, channelId, date } },
    update: { messages: { increment: 1 } },
    create: { userId, channelId, date, messages: 1 },
  });
}
