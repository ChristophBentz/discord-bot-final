import type { Client } from "discord.js";
import { closeTicket, sendModReply, ensurePanel } from "../../features/tickets/service.js";

export interface ReplyBody {
  content?: string;
  moderatorId?: string;
  moderatorName?: string;
}

export interface CloseBody {
  moderatorId?: string;
}

export type ReplyResult = { ok: true } | { ok: false; error: string };

export async function handleTicketReply(
  client: Client,
  ticketId: number,
  body: ReplyBody,
): Promise<ReplyResult> {
  const content = (body.content ?? "").trim();
  if (!content) return { ok: false, error: "Inhalt darf nicht leer sein." };
  if (content.length > 2000) return { ok: false, error: "Max. 2000 Zeichen." };

  return sendModReply(client, ticketId, {
    authorId: body.moderatorId ?? "unknown",
    authorName: body.moderatorName ?? "Staff",
    content,
  });
}

export async function handleTicketClose(
  client: Client,
  ticketId: number,
  body: CloseBody,
): Promise<ReplyResult> {
  return closeTicket(client, ticketId, body.moderatorId ?? "unknown");
}

// Wenn der Channel/Toggle gerade gewechselt wurde, lass den Bot ein neues Panel hochziehen
export async function handleEnsurePanel(client: Client): Promise<ReplyResult> {
  await ensurePanel(client);
  return { ok: true };
}
