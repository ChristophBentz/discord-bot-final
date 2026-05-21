"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";

const MAX_STATUS_LENGTH = 128;

export type SaveStatusResult =
  | { ok: true; text: string | null }
  | { ok: false; error: string };

export async function saveBotStatus(formData: FormData): Promise<SaveStatusResult> {
  const raw = String(formData.get("botStatusText") ?? "").trim();

  if (raw.length > MAX_STATUS_LENGTH) {
    return { ok: false, error: `Maximal ${MAX_STATUS_LENGTH} Zeichen erlaubt.` };
  }

  const text = raw === "" ? null : raw;

  await prisma.config.upsert({
    where: { id: 1 },
    update: { botStatusText: text },
    create: { id: 1, botStatusText: text },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/general");

  return { ok: true, text };
}
