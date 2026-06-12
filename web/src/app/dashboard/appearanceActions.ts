"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { isHexColor } from "@/lib/accent";
import { requireAuth } from "@/lib/requireAuth";

export type SaveAccentResult = { ok: true } | { ok: false; error: string };

export async function saveAccentColor(from: string, to: string): Promise<SaveAccentResult> {
  const auth = await requireAuth();
  if (auth) return auth;
  if (!isHexColor(from) || !isHexColor(to)) {
    return { ok: false, error: "Farben müssen Hex-Werte im Format #rrggbb sein." };
  }

  await prisma.config.upsert({
    where: { id: 1 },
    update: { accentFrom: from, accentTo: to },
    create: { id: 1, accentFrom: from, accentTo: to },
  });

  // Akzentfarbe wird im Root-Layout injiziert → alles neu validieren.
  revalidatePath("/", "layout");
  return { ok: true };
}
