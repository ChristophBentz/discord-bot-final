import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { computeImageHash, makeThumbnail } from "../../features/autoMod/imageHash.js";
import { invalidateBlockedImageCache } from "../../features/autoMod/service.js";

export interface AddBlockedImageBody {
  imageBase64?: string; // data:image/...;base64,... oder reines base64
  label?: string;
  addedBy?: string;
}

type Result = { ok: true; id: number; hash: string } | { ok: false; error: string };

function stripDataUrl(input: string): string {
  const comma = input.indexOf(",");
  return input.startsWith("data:") && comma !== -1 ? input.slice(comma + 1) : input;
}

export async function handleAddBlockedImage(body: AddBlockedImageBody): Promise<Result> {
  const label = (body.label ?? "").trim() || "Unbenannt";
  const addedBy = (body.addedBy ?? "").trim();
  if (!body.imageBase64) return { ok: false, error: "Kein Bild übergeben" };

  let buffer: Buffer;
  try {
    buffer = Buffer.from(stripDataUrl(body.imageBase64), "base64");
  } catch {
    return { ok: false, error: "Bild ist kein gültiges base64" };
  }
  if (buffer.length === 0) return { ok: false, error: "Bild ist leer" };
  if (buffer.length > 8 * 1024 * 1024) return { ok: false, error: "Bild zu groß (max 8 MB)" };

  const hash = await computeImageHash(buffer);
  if (!hash) return { ok: false, error: "Bild konnte nicht dekodiert werden" };

  // Duplikate vermeiden (exakt gleicher Hash bereits hinterlegt)
  const existing = await prisma.blockedImage.findFirst({ where: { hash } });
  if (existing) return { ok: false, error: "Dieses Bild ist bereits hinterlegt" };

  const thumbnail = await makeThumbnail(buffer);
  const row = await prisma.blockedImage.create({
    data: { hash, label, thumbnail, addedBy },
  });
  invalidateBlockedImageCache();
  logger.info({ id: row.id, hash, label }, "AutoMod: Scam-Bild hinterlegt");
  return { ok: true, id: row.id, hash };
}

export async function handleDeleteBlockedImage(id: number): Promise<Result> {
  try {
    await prisma.blockedImage.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Eintrag nicht gefunden" };
  }
  invalidateBlockedImageCache();
  return { ok: true, id, hash: "" };
}
