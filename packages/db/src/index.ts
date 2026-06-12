import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";

/**
 * Text für die Suche normalisieren: Unicode-Schriftarten (𝑺𝒏𝒐𝒐𝒌𝒚 → snooky),
 * Ligaturen und Akzente (é → e) auf einfache Kleinbuchstaben falten.
 * Muss identisch bleiben mit web/src/lib/normalizeSearch.ts (Client-Kopie).
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC") // Kompatibilitäts-Zeichen → Basis-Zeichen (𝑺 → S, ﬁ → fi)
    .normalize("NFD") // Akzente als kombinierende Zeichen abspalten
    .replace(/[̀-ͯ]/g, "") // kombinierende Akzente entfernen
    .toLowerCase()
    .trim();
}

export async function getConfig() {
  const existing = await prisma.config.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.config.create({ data: { id: 1 } });
}
