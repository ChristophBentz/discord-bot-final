// MiniMax Image-Generation API.
// Endpoint: https://api.minimaxi.com/v1/image_generation
// Docs: https://intl.minimaxi.com/document/Image-01

export interface MinimaxImageRequest {
  apiKey: string;
  model: string; // z.B. "image-01"
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";
}

export interface MinimaxImageResult {
  ok: true;
  imageUrls: string[];
}

export interface MinimaxImageError {
  ok: false;
  error: string;
}

const ENDPOINT = "https://api.minimaxi.com/v1/image_generation";

export async function generateImage(
  req: MinimaxImageRequest,
): Promise<MinimaxImageResult | MinimaxImageError> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${req.apiKey}`,
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

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `MiniMax HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as {
      base_resp?: { status_code: number; status_msg: string };
      data?: { image_urls?: string[] };
    };

    if (json.base_resp && json.base_resp.status_code !== 0) {
      return {
        ok: false,
        error: `MiniMax: ${json.base_resp.status_msg} (Code ${json.base_resp.status_code})`,
      };
    }

    const urls = json.data?.image_urls ?? [];
    if (urls.length === 0) {
      return { ok: false, error: "MiniMax hat keine Bilder zurückgegeben" };
    }
    return { ok: true, imageUrls: urls };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Netzwerk-Fehler",
    };
  }
}
