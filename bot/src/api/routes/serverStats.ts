import type { Client } from "discord.js";
import {
  diagnose,
  ensureStatChannels,
  resetChannelReferences,
  updateAllStats,
  type Diagnose,
} from "../../features/serverStats/service.js";

export async function handleServerStatsReset(
  client: Client,
): Promise<{ ok: true; recreated: number } | { ok: false; error: string }> {
  try {
    const r = await resetChannelReferences(client);
    return { ok: true, recreated: r.recreated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function handleServerStatsDiagnose(
  client: Client,
): Promise<{ ok: true; data: Diagnose } | { ok: false; error: string }> {
  try {
    const data = await diagnose(client);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

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
): Promise<
  | { ok: true; renamed: number; unchanged: number; failed: number }
  | { ok: false; error: string }
> {
  try {
    await ensureStatChannels(client);
    const r = await updateAllStats(client);
    return { ok: true, ...r };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
