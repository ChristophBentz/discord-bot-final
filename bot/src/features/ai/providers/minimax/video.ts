import { callMinimax, getMinimax, type MinimaxClient } from "./client.js";

export interface VideoRequest extends MinimaxClient {
  model: string;
  prompt: string;
}

export interface VideoResult {
  ok: boolean;
  videoUrl?: string;
  /** mp4-Buffer (gedownloaded für Discord-Attachment) */
  video?: Buffer;
  error?: string;
}

// MiniMax-Video ist asynchron: 1) submit → task_id, 2) poll status, 3) retrieve file.
export async function generateVideo(req: VideoRequest): Promise<VideoResult> {
  // 1) Job submitten
  const submit = await callMinimax<{ task_id?: string }>(
    req,
    "/v1/video_generation",
    { model: req.model, prompt: req.prompt },
  );
  if (!submit.ok) return { ok: false, error: submit.error };
  const taskId = submit.data?.task_id;
  if (!taskId) return { ok: false, error: "Kein task_id zurückgegeben" };

  // 2) Pollen — max 4 Min (Discord erlaubt 15 Min Follow-up nach Defer)
  const MAX_POLLS = 24;
  const POLL_INTERVAL_MS = 10_000;
  let fileId: string | null = null;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const status = await getMinimax<{
      status?: string;
      file_id?: string;
    }>(req, `/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`);

    if (!status.ok) {
      return { ok: false, error: `Polling-Fehler: ${status.error}` };
    }
    const s = (status.data?.status ?? "").toLowerCase();
    if (s === "success" || s === "succeed") {
      fileId = status.data?.file_id ?? null;
      break;
    }
    if (s === "fail" || s === "failed") {
      return { ok: false, error: "MiniMax meldet 'Fail' beim Video-Job" };
    }
    // sonst "Processing", "Queueing" — weiter pollen
  }

  if (!fileId) {
    return { ok: false, error: "Video nach 4 Min noch nicht fertig — versuch's nochmal" };
  }

  // 3) File-URL retrieven
  const file = await getMinimax<{
    file?: { download_url?: string };
  }>(req, `/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`);
  if (!file.ok) return { ok: false, error: `File-Retrieve: ${file.error}` };
  const url = file.data?.file?.download_url;
  if (!url) return { ok: false, error: "Keine download_url im file-Response" };

  // Download für Discord-Attachment
  try {
    const dl = await fetch(url);
    if (dl.ok) {
      const buffer = Buffer.from(await dl.arrayBuffer());
      return { ok: true, videoUrl: url, video: buffer };
    }
  } catch {
    /* fallback auf URL only */
  }
  return { ok: true, videoUrl: url };
}
