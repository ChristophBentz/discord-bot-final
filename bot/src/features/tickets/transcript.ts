import { AttachmentBuilder } from "discord.js";
import { prisma } from "@repo/db";

interface TranscriptResult {
  filename: string;
  content: string;
  attachment: AttachmentBuilder;
}

// Erstellt eine Text-Datei mit dem kompletten Ticket-Verlauf.
export async function buildTranscript(ticketId: number): Promise<TranscriptResult | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return null;

  const lines: string[] = [];
  lines.push(`Ticket #${ticket.id}`);
  lines.push(`User:       ${ticket.username ?? "?"} (${ticket.userId})`);
  lines.push(`Topic:      ${ticket.topic ?? "—"}`);
  lines.push(`Geöffnet:   ${ticket.createdAt.toISOString()}`);
  if (ticket.closedAt) lines.push(`Geschlossen: ${ticket.closedAt.toISOString()}`);
  if (ticket.closedBy) lines.push(`Von Mod:    ${ticket.closedBy}`);
  lines.push("");
  lines.push("─".repeat(60));
  lines.push("");

  for (const msg of ticket.messages) {
    const ts = msg.createdAt.toISOString().replace("T", " ").slice(0, 19);
    const tag = msg.fromMod ? "[MOD] " : "      ";
    lines.push(`[${ts}] ${tag}${msg.authorName}:`);
    for (const line of msg.content.split("\n")) {
      lines.push(`        ${line}`);
    }
    lines.push("");
  }

  const content = lines.join("\n");
  const filename = `ticket-${ticket.id}.txt`;
  const buffer = Buffer.from(content, "utf-8");
  const attachment = new AttachmentBuilder(buffer, { name: filename });

  return { filename, content, attachment };
}
