import { Jimp } from "jimp";

/**
 * Perceptual Image Hashing (dHash) — erkennt ähnliche Bilder auch nach
 * Verkleinern/Neukomprimieren. Verfahren: Bild auf 9×8 Graustufen skalieren,
 * benachbarte Pixel horizontal vergleichen → 64 Bit → 16-stelliger Hex-String.
 *
 * Pure-JS (jimp), keine nativen Binaries → keine Lockfile-Fallstricke.
 */
export async function computeImageHash(buffer: Buffer): Promise<string | null> {
  try {
    const img = await Jimp.read(buffer);
    img.resize({ w: 9, h: 8 }).greyscale();
    let hash = 0n;
    let bit = 0;
    const { data, width } = img.bitmap;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = data[(width * y + x) * 4]!;
        const right = data[(width * y + x + 1) * 4]!;
        if (left < right) hash |= 1n << BigInt(bit);
        bit++;
      }
    }
    return hash.toString(16).padStart(16, "0");
  } catch {
    // Nicht dekodierbares Format (z.B. exotisches WebP) → überspringen.
    return null;
  }
}

/** Anzahl unterschiedlicher Bits zweier Hex-Hashes (0 = identisch, höher = unähnlicher). */
export function hammingDistance(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

/** Kleines Vorschau-Thumbnail (64px breit) als data-URL fürs Dashboard. */
export async function makeThumbnail(buffer: Buffer): Promise<string | null> {
  try {
    const img = await Jimp.read(buffer);
    img.resize({ w: 64 });
    const base64 = await img.getBase64("image/png");
    return base64;
  } catch {
    return null;
  }
}
