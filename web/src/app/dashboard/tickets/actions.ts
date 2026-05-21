"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

const SNOWFLAKE = /^\d{17,20}$/;

export type Result = { ok: true } | { ok: false; error: string };

async function getMod(): Promise<{ id: string; name: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as { discordId?: string }).discordId ?? "dashboard",
    name: session.user.name ?? "Staff",
  };
}

export async function saveTicketSettings(formData: FormData): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };

  const enabled = formData.get("ticketsEnabled") === "on";
  const channelId = String(formData.get("ticketChannelId") ?? "").trim();
  if (channelId && !SNOWFLAKE.test(channelId)) {
    return { ok: false, error: "Channel-ID muss eine Snowflake sein." };
  }

  // Wenn Channel-Wechsel: bestehende Panel-ID resetten, Bot postet neu.
  const existing = await prisma.config.findUnique({ where: { id: 1 } });
  const channelChanged = existing?.ticketChannelId !== (channelId === "" ? null : channelId);

  await prisma.config.upsert({
    where: { id: 1 },
    update: {
      ticketsEnabled: enabled,
      ticketChannelId: channelId === "" ? null : channelId,
      ...(channelChanged ? { ticketPanelMessageId: null } : {}),
    },
    create: {
      id: 1,
      ticketsEnabled: enabled,
      ticketChannelId: channelId === "" ? null : channelId,
    },
  });

  // Bot benachrichtigen → neues Panel posten (falls aktiv + Channel gesetzt)
  if (enabled && channelId) {
    await callBot("/api/tickets/ensure-panel", { method: "POST" });
  }

  revalidatePath("/dashboard/tickets");
  return { ok: true };
}

export async function replyToTicket(ticketId: number, content: string): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };

  const res = await callBot(`/api/tickets/${ticketId}/reply`, {
    method: "POST",
    body: { content, moderatorId: mod.id, moderatorName: mod.name },
  });
  if (!res.ok) return res;

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
  return { ok: true };
}

export async function closeTicket(ticketId: number): Promise<Result> {
  const mod = await getMod();
  if (!mod) return { ok: false, error: "Nicht eingeloggt." };

  const res = await callBot(`/api/tickets/${ticketId}/close`, {
    method: "POST",
    body: { moderatorId: mod.id },
  });
  if (!res.ok) return res;

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
  return { ok: true };
}
