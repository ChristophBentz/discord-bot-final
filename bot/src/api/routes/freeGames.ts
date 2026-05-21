import type { Client } from "discord.js";
import { checkAndPostFreeGames } from "../../features/freeGames/service.js";

export async function handleFreeGamesCheck(
  client: Client,
): Promise<{ ok: true; posted: number; skipped: number; fetched: number } | { ok: false; error: string }> {
  try {
    const res = await checkAndPostFreeGames(client);
    if (res.disabled) return { ok: false, error: "Free-Games-Feature ist im Dashboard deaktiviert." };
    if (res.channelMissing)
      return { ok: false, error: "Kein Channel konfiguriert oder Channel nicht erreichbar." };
    return { ok: true, posted: res.posted, skipped: res.skipped, fetched: res.fetched };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
