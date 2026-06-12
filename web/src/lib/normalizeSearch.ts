/**
 * Client-sichere Kopie von normalizeSearchText aus @repo/db — das Paket kann
 * im Browser nicht importiert werden (zieht PrismaClient mit).
 * Muss identisch bleiben mit packages/db/src/index.ts.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC") // Kompatibilitäts-Zeichen → Basis-Zeichen (𝑺 → S, ﬁ → fi)
    .normalize("NFD") // Akzente als kombinierende Zeichen abspalten
    .replace(/[̀-ͯ]/g, "") // kombinierende Akzente entfernen
    .toLowerCase()
    .trim();
}
