// Gemeinsamer Fetch-Helper für alle MiniMax-Endpoints.

export interface MinimaxClient {
  apiKey: string;
  baseUrl: string;
  groupId?: string | null;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  rawBody?: string;
  httpStatus?: number;
}

export async function callMinimax<T>(
  client: MinimaxClient,
  path: string,
  body: unknown,
  options: { appendGroupIdToQuery?: boolean } = {},
): Promise<ApiResult<T>> {
  const groupQuery = options.appendGroupIdToQuery && client.groupId?.trim()
    ? `?GroupId=${encodeURIComponent(client.groupId.trim())}`
    : "";
  const url = `${client.baseUrl.replace(/\/+$/, "")}${path}${groupQuery}`;
  const apiKey = client.apiKey.trim();

  if (!apiKey) return { ok: false, error: "API-Key ist leer" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const rawBody = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status} — ${rawBody.slice(0, 300)}`,
        rawBody: rawBody.slice(0, 1000),
        httpStatus: res.status,
      };
    }
    let parsed: { base_resp?: { status_code: number; status_msg: string } } & T;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return { ok: false, error: `Antwort kein JSON: ${rawBody.slice(0, 200)}`, rawBody };
    }
    if (parsed.base_resp && parsed.base_resp.status_code !== 0) {
      return {
        ok: false,
        error: `${parsed.base_resp.status_msg} (Code ${parsed.base_resp.status_code})`,
        rawBody,
        httpStatus: res.status,
      };
    }
    return { ok: true, data: parsed, rawBody, httpStatus: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Netzwerk-Fehler" };
  }
}

export async function getMinimax<T>(
  client: MinimaxClient,
  path: string,
): Promise<ApiResult<T>> {
  const apiKey = client.apiKey.trim();
  const url = `${client.baseUrl.replace(/\/+$/, "")}${path}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const rawBody = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status} — ${rawBody.slice(0, 300)}`,
        rawBody: rawBody.slice(0, 1000),
        httpStatus: res.status,
      };
    }
    const parsed = JSON.parse(rawBody) as { base_resp?: { status_code: number; status_msg: string } } & T;
    if (parsed.base_resp && parsed.base_resp.status_code !== 0) {
      return {
        ok: false,
        error: `${parsed.base_resp.status_msg} (Code ${parsed.base_resp.status_code})`,
        rawBody,
      };
    }
    return { ok: true, data: parsed, rawBody };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Netzwerk-Fehler" };
  }
}
