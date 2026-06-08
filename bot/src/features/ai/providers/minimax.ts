// MiniMax Image-Generation API.
// Endpoints (je nach Region):
//   - https://api.minimaxi.com/v1/image_generation (International)
//   - https://api.minimax.chat/v1/image_generation (Mainland China)
// Docs: https://intl.minimaxi.com/document/Image-01

export interface MinimaxImageRequest {
  apiKey: string;
  baseUrl: string; // z.B. "https://api.minimaxi.com"
  model: string;
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";
  groupId?: string; // wird als ?GroupId=... an die URL angehängt wenn gesetzt
}

export interface MinimaxImageResult {
  ok: true;
  imageUrls: string[];
}

export interface MinimaxImageError {
  ok: false;
  error: string;
  debug?: {
    httpStatus: number;
    rawResponse: string;
    endpoint: string;
  };
}

export async function generateImage(
  req: MinimaxImageRequest,
): Promise<MinimaxImageResult | MinimaxImageError> {
  const groupQuery = req.groupId?.trim() ? `?GroupId=${encodeURIComponent(req.groupId.trim())}` : "";
  const endpoint = `${req.baseUrl.replace(/\/+$/, "")}/v1/image_generation${groupQuery}`;
  const apiKey = req.apiKey.trim();

  if (!apiKey) {
    return { ok: false, error: "API-Key ist leer" };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: req.model,
        prompt: req.prompt,
        aspect_ratio: req.aspectRatio ?? "1:1",
        response_format: "url",
        n: 1,
        prompt_optimizer: true,
      }),
    });

    const rawText = await res.text();

    if (!res.ok) {
      // HTTP-Error — Body als Hint zurückgeben
      return {
        ok: false,
        error: `HTTP ${res.status} — ${rawText.slice(0, 300)}`,
        debug: { httpStatus: res.status, rawResponse: rawText.slice(0, 1000), endpoint },
      };
    }

    let json: {
      base_resp?: { status_code: number; status_msg: string };
      data?: { image_urls?: string[] };
    };
    try {
      json = JSON.parse(rawText);
    } catch {
      return {
        ok: false,
        error: `Antwort kein JSON: ${rawText.slice(0, 200)}`,
        debug: { httpStatus: res.status, rawResponse: rawText.slice(0, 1000), endpoint },
      };
    }

    if (json.base_resp && json.base_resp.status_code !== 0) {
      return {
        ok: false,
        error: `MiniMax: ${json.base_resp.status_msg} (Code ${json.base_resp.status_code})`,
        debug: { httpStatus: res.status, rawResponse: rawText.slice(0, 1000), endpoint },
      };
    }

    const urls = json.data?.image_urls ?? [];
    if (urls.length === 0) {
      return {
        ok: false,
        error: "Antwort enthält keine Bilder",
        debug: { httpStatus: res.status, rawResponse: rawText.slice(0, 1000), endpoint },
      };
    }
    return { ok: true, imageUrls: urls };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Netzwerk-Fehler",
      debug: { httpStatus: 0, rawResponse: "", endpoint },
    };
  }
}
