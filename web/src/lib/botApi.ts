// Server-side fetch zum Bot — niemals an den Client geben.

const BASE = process.env.BOT_API_URL ?? "http://localhost:4001";
const SECRET = process.env.BOT_API_SECRET ?? "";

// Hängender Bot darf Page-Renders nicht unbegrenzt blockieren. Mutationen
// (Command-Sync, Avatar-Upload) gehen bot-seitig an Discord und dürfen länger dauern.
const GET_TIMEOUT_MS = 5_000;
const MUTATION_TIMEOUT_MS = 30_000;

export async function callBot<T>(
  path: string,
  init: { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = { method: "GET" },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  if (!SECRET) {
    return { ok: false, error: "BOT_API_SECRET ist nicht gesetzt (in web/.env.local)." };
  }
  try {
    const res = await fetch(BASE + path, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        "x-bot-api-key": SECRET,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      // Wichtig: kein Caching für Mutationen.
      cache: "no-store",
      signal: AbortSignal.timeout(
        init.method === "GET" ? GET_TIMEOUT_MS : MUTATION_TIMEOUT_MS,
      ),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & T;
    if (!res.ok || json.ok === false) {
      return { ok: false, error: json.error ?? `Bot antwortete mit Status ${res.status}` };
    }
    return { ok: true, data: json };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, error: "Bot antwortet nicht (Timeout)." };
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ECONNREFUSED")) {
      return { ok: false, error: "Bot ist nicht erreichbar (läuft er?)." };
    }
    return { ok: false, error: msg };
  }
}
