import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type Client,
  type GuildMember,
  type TextChannel,
  ThreadAutoArchiveDuration,
} from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { env } from "../../lib/env.js";

export function buildPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x2dd4bf)
    .setTitle("🎫 Brauchst du Hilfe?")
    .setDescription(
      "Klick auf den Button unten, um ein privates Ticket zu öffnen. Ein Mod meldet sich so bald wie möglich.",
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:open")
      .setLabel("Ticket öffnen")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🎫"),
  );
  return { embeds: [embed], components: [row] };
}

// Beim Start: sicherstellen, dass das Panel im Ticket-Channel existiert.
export async function ensurePanel(client: Client): Promise<void> {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  if (!config?.ticketsEnabled || !config.ticketChannelId) return;

  const channel = await client.channels.fetch(config.ticketChannelId).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) {
    logger.warn({ channelId: config.ticketChannelId }, "Ticket-Channel nicht gefunden");
    return;
  }
  const txt = channel as TextChannel;

  // Wenn ID gesetzt: prüfen ob Message noch existiert
  if (config.ticketPanelMessageId) {
    const existing = await txt.messages
      .fetch(config.ticketPanelMessageId)
      .catch(() => null);
    if (existing) {
      // Panel existiert — edit für aktuelle Version
      await existing.edit(buildPanel()).catch(() => {});
      return;
    }
  }

  // Neu posten
  try {
    const msg = await txt.send(buildPanel());
    await prisma.config.update({
      where: { id: 1 },
      data: { ticketPanelMessageId: msg.id },
    });
    logger.info({ messageId: msg.id, channelId: txt.id }, "Ticket-Panel gepostet");
  } catch (err) {
    logger.error({ err }, "Konnte Ticket-Panel nicht posten");
  }
}

// Öffnet ein neues Ticket (private Thread im Ticket-Channel).
export async function openTicket(member: GuildMember): Promise<
  | { ok: true; threadId: string; ticketId: number }
  | { ok: false; error: string }
> {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  if (!config?.ticketsEnabled || !config.ticketChannelId) {
    return { ok: false, error: "Ticket-System ist aus." };
  }

  // Existiert schon ein offenes Ticket?
  const open = await prisma.ticket.findFirst({
    where: { userId: member.id, status: "open" },
  });
  if (open) {
    return { ok: false, error: `Du hast bereits ein offenes Ticket: <#${open.channelId}>` };
  }

  const channel = await member.client.channels.fetch(config.ticketChannelId).catch(() => null);
  if (!channel?.isTextBased() || channel.type !== ChannelType.GuildText) {
    return { ok: false, error: "Ticket-Channel ungültig." };
  }
  const parent = channel as TextChannel;

  try {
    const thread = await parent.threads.create({
      name: `ticket-${member.user.username}`.slice(0, 100),
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Ticket von ${member.user.username}`,
    });
    await thread.members.add(member.id).catch(() => {});

    const ticket = await prisma.ticket.create({
      data: {
        channelId: thread.id,
        userId: member.id,
        username: member.user.username,
      },
    });

    const welcome = new EmbedBuilder()
      .setColor(0x2dd4bf)
      .setTitle("👋 Ticket geöffnet")
      .setDescription(
        `Hallo <@${member.id}>, beschreibe dein Anliegen. Ein Mod liest mit und antwortet bald.\n\nDu kannst das Ticket jederzeit selbst schließen, indem du **!close** sendest.`,
      )
      .setFooter({ text: `Ticket-ID: ${ticket.id}` });
    await thread.send({ embeds: [welcome] });

    // Initialer System-Eintrag in DB
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: member.client.user!.id,
        authorName: "System",
        fromMod: true,
        content: "Ticket geöffnet.",
      },
    });

    logger.info(
      { ticketId: ticket.id, threadId: thread.id, userId: member.id },
      "Ticket geöffnet",
    );
    return { ok: true, threadId: thread.id, ticketId: ticket.id };
  } catch (err) {
    logger.error({ err, userId: member.id }, "Ticket-Öffnung fehlgeschlagen");
    return { ok: false, error: "Konnte Ticket nicht öffnen (Permissions?)." };
  }
}

// Schließt ein Ticket: Thread archivieren + DB-Status updaten.
export async function closeTicket(
  client: Client,
  ticketId: number,
  closedBy: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, error: "Ticket nicht gefunden." };
  if (ticket.status === "closed") return { ok: true };

  const thread = await client.channels.fetch(ticket.channelId).catch(() => null);
  if (thread?.isThread()) {
    try {
      await thread.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x95a5a6)
            .setDescription(`🔒 Dieses Ticket wurde geschlossen.`),
        ],
      });
      await thread.setArchived(true).catch(() => {});
      await thread.setLocked(true).catch(() => {});
    } catch (err) {
      logger.warn({ err, threadId: thread.id }, "Thread-Archivieren fehlgeschlagen");
    }
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "closed", closedAt: new Date(), closedBy },
  });
  await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId: closedBy,
      authorName: closedBy === ticket.userId ? "User" : "Mod",
      fromMod: closedBy !== ticket.userId,
      content: "Ticket geschlossen.",
    },
  });

  logger.info({ ticketId, closedBy }, "Ticket geschlossen");
  return { ok: true };
}

// Mod schreibt aus dem Dashboard zurück.
export async function sendModReply(
  client: Client,
  ticketId: number,
  args: { authorId: string; authorName: string; content: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, error: "Ticket nicht gefunden." };
  if (ticket.status !== "open") return { ok: false, error: "Ticket ist nicht mehr offen." };

  const thread = await client.channels.fetch(ticket.channelId).catch(() => null);
  if (!thread?.isThread()) return { ok: false, error: "Thread nicht gefunden." };

  try {
    if (thread.archived) await thread.setArchived(false);
    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setAuthor({ name: `${args.authorName} (Mod)` })
      .setDescription(args.content)
      .setTimestamp(new Date());
    await thread.send({ embeds: [embed] });
  } catch (err) {
    logger.warn({ err, threadId: thread.id }, "Mod-Reply-Posten fehlgeschlagen");
    return { ok: false, error: "Konnte Nachricht nicht posten." };
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId: args.authorId,
      authorName: args.authorName,
      fromMod: true,
      content: args.content,
    },
  });

  return { ok: true };
}

// Helper für Web zum Erkennen
export async function getTicketByThread(threadId: string) {
  return prisma.ticket.findUnique({ where: { channelId: threadId } });
}

// Löscht Discord-Threads von Tickets, die seit > 2 Tagen geschlossen sind.
// DB-Records bleiben erhalten — Mods können im Dashboard weiter durchscrollen.
const TICKET_THREAD_TTL_MS = 2 * 24 * 60 * 60 * 1000;

export async function cleanupExpiredTicketThreads(client: Client): Promise<void> {
  const cutoff = new Date(Date.now() - TICKET_THREAD_TTL_MS);
  const expired = await prisma.ticket.findMany({
    where: {
      status: "closed",
      closedAt: { lt: cutoff, not: null },
    },
    select: { id: true, channelId: true },
  });
  if (expired.length === 0) return;

  let deleted = 0;
  for (const t of expired) {
    const thread = await client.channels.fetch(t.channelId).catch(() => null);
    if (!thread || !thread.isThread()) continue; // schon weg
    try {
      await thread.delete("Ticket >2 Tage geschlossen — Auto-Cleanup");
      deleted += 1;
    } catch (err) {
      logger.warn({ err, ticketId: t.id }, "Auto-Delete Thread fehlgeschlagen");
    }
  }
  if (deleted > 0) {
    logger.info({ deleted, checked: expired.length }, "Alte Ticket-Threads gelöscht");
  }
}

// Periodischer Cleanup-Job — stündlich + einmal beim Start.
export function startTicketCleanup(client: Client): void {
  void cleanupExpiredTicketThreads(client).catch((err) =>
    logger.error({ err }, "Initialer Ticket-Cleanup fehlgeschlagen"),
  );
  setInterval(() => {
    void cleanupExpiredTicketThreads(client).catch((err) =>
      logger.error({ err }, "Ticket-Cleanup-Job fehlgeschlagen"),
    );
  }, 60 * 60 * 1000);
}

void env;
