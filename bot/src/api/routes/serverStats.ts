import type { Client } from "discord.js";
import { ensureStatChannels, updateAllStats } from "../../features/serverStats/service.js";

export async function handleServerStatsEnsure(
  client: Client,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await ensureStatChannels(client);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function handleServerStatsUpdate(
  client: Client,
  force: boolean,
): Promise<
  | { ok: true; updated: number; skipped: number; alreadyCurrent: number }
  | { ok: false; error: string }
> {
  try {
    const r = await updateAllStats(client, force);
    return { ok: true, ...r };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
