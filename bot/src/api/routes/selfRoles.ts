import type { Client } from "discord.js";
import { prisma } from "@repo/db";
import { deletePanelMessage, syncPanelMessage } from "../../features/selfRoles/service.js";

export async function handleSelfRoleSync(
  client: Client,
  panelId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await syncPanelMessage(client, panelId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function handleSelfRoleDeleteMessage(
  client: Client,
  panelId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const panel = await prisma.selfRolePanel.findUnique({ where: { id: panelId } });
    if (!panel) return { ok: false, error: "Panel nicht gefunden." };
    await deletePanelMessage(client, panel.channelId, panel.messageId);
    await prisma.selfRolePanel.update({ where: { id: panelId }, data: { messageId: null } });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
