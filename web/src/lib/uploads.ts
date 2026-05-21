import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const PUBLIC_DIR = join(process.cwd(), "public");
const UPLOAD_BASE = "/uploads/achievements";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export interface SavedUpload {
  url: string;       // /uploads/achievements/abc123.png
  diskPath: string;  // absolute path zum Löschen
}

export async function saveAchievementImage(file: File): Promise<
  { ok: true; data: SavedUpload } | { ok: false; error: string }
> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Nur PNG, JPG, WEBP oder GIF erlaubt." };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "Bild ist zu groß (max. 2 MB)." };
  }

  const ext = EXT_BY_TYPE[file.type] ?? "bin";
  const name = randomBytes(8).toString("hex") + "." + ext;
  const dir = join(PUBLIC_DIR, "uploads", "achievements");
  await mkdir(dir, { recursive: true });
  const diskPath = join(dir, name);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);

  return { ok: true, data: { url: `${UPLOAD_BASE}/${name}`, diskPath } };
}

export async function deleteAchievementImage(url: string | null): Promise<void> {
  if (!url || !url.startsWith(UPLOAD_BASE + "/")) return;
  const filename = url.slice(UPLOAD_BASE.length + 1);
  // Schutz vor Path-Traversal
  if (filename.includes("/") || filename.includes("..")) return;
  const diskPath = join(PUBLIC_DIR, "uploads", "achievements", filename);
  await unlink(diskPath).catch(() => {});
}
