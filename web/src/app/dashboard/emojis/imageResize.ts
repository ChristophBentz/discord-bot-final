// Verkleinert/komprimiert ein Bild via Canvas auf Discord-Emoji-Specs:
// 128×128 max, unter 256 KB. Animierte GIFs bleiben unverändert
// (Canvas kann keine Animation rausschreiben).

const DISCORD_MAX_BYTES = 256 * 1024;
const TARGET_SIZE = 128;

export interface ResizeResult {
  dataUrl: string; // data:image/...;base64,...
  width: number;
  height: number;
  byteSize: number; // ungefähre rohe Größe
  format: "png" | "jpeg" | "gif" | "webp";
  shrunk: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function dataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  // base64 zu Bytes ~ length * 3 / 4 (minus padding)
  return Math.ceil((base64.length * 3) / 4);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function processImageForEmoji(file: File): Promise<ResizeResult> {
  // GIF (animiert) → durchreichen ohne Canvas (Animation würde sonst verloren gehen)
  if (file.type === "image/gif") {
    if (file.size > DISCORD_MAX_BYTES) {
      throw new Error(
        `GIF ist ${Math.round(file.size / 1024)} KB — Discord erlaubt max. 256 KB. Vorher in einem GIF-Optimizer (z.B. ezgif.com) verkleinern.`,
      );
    }
    const dataUrl = await fileToDataUrl(file);
    return {
      dataUrl,
      width: 0,
      height: 0,
      byteSize: file.size,
      format: "gif",
      shrunk: false,
    };
  }

  const img = await loadImage(file);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  // Aspect-Ratio beibehalten, in 128×128 reinpassen
  const scale = Math.min(TARGET_SIZE / origW, TARGET_SIZE / origH, 1);
  const w = Math.max(1, Math.round(origW * scale));
  const h = Math.max(1, Math.round(origH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas-Context nicht verfügbar.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  // 1) PNG versuchen
  let dataUrl = canvas.toDataURL("image/png");
  let format: "png" | "jpeg" | "webp" = "png";

  // 2) Falls > 256 KB → WebP (lossless first, dann lossy)
  if (dataUrlByteSize(dataUrl) > DISCORD_MAX_BYTES) {
    dataUrl = canvas.toDataURL("image/webp", 0.9);
    format = "webp";
  }
  // 3) Falls immer noch zu groß → JPEG mit fallender Qualität
  if (dataUrlByteSize(dataUrl) > DISCORD_MAX_BYTES) {
    for (const q of [0.9, 0.8, 0.7, 0.6, 0.5]) {
      dataUrl = canvas.toDataURL("image/jpeg", q);
      format = "jpeg";
      if (dataUrlByteSize(dataUrl) <= DISCORD_MAX_BYTES) break;
    }
  }

  if (dataUrlByteSize(dataUrl) > DISCORD_MAX_BYTES) {
    throw new Error(
      "Bild ließ sich nicht unter 256 KB komprimieren — bitte ein einfacheres/kleineres Bild wählen.",
    );
  }

  return {
    dataUrl,
    width: w,
    height: h,
    byteSize: dataUrlByteSize(dataUrl),
    format,
    shrunk: scale < 1,
  };
}

export function fileNameToEmojiName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/\W+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 32);
}
