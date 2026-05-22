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
  type Webhook,
} from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { env } from "../../lib/env.js";
import { buildTranscript } from "./transcript.js";

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

  // 1. DB-Status updaten + Close-Line in den Verlauf eintragen (damit's im Transkript steht)
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

  // 2. Transkript bauen — wird sowohl im Thread (für den User) als auch im
  //    Archiv-Channel (für Mods) gepostet, falls jeweils konfiguriert.
  const transcript = await buildTranscript(ticketId).catch(() => null);

  // 3. Close-Embed + Transkript-Datei im Thread posten, dann Thread archivieren
  const thread = await client.channels.fetch(ticket.channelId).catch(() => null);
  if (thread?.isThread()) {
    try {
      const closeEmbed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle("🔒 Ticket geschlossen")
        .setDescription(
          transcript
            ? "Hier ist das komplette Transkript zum Nachlesen und Herunterladen."
            : "Dieses Ticket wurde geschlossen.",
        );
      await thread.send({
        embeds: [closeEmbed],
        files: transcript ? [transcript.attachment] : [],
      });
      await thread.setArchived(true).catch(() => {});
      await thread.setLocked(true).catch(() => {});
    } catch (err) {
      logger.warn({ err, threadId: thread.id }, "Thread-Archivieren fehlgeschlagen");
    }
  }

  // 4. Archive-Channel-Post für Mods + Rating-DM async — blockiert nicht.
  void postCloseSideEffects(client, ticketId).catch((err) =>
    logger.error({ err, ticketId }, "Ticket post-close side effects fehlgeschlagen"),
  );

  logger.info({ ticketId, closedBy }, "Ticket geschlossen");
  return { ok: true };
}

// Nach dem Schließen: Transkript in Channel + Rating-DM an User.
async function postCloseSideEffects(client: Client, ticketId: number): Promise<void> {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || !config) return;

  // 1. Transkript-Post
  if (config.ticketTranscriptEnabled && config.ticketTranscriptChannelId) {
    try {
      const transcript = await buildTranscript(ticketId);
      const channel = await client.channels
        .fetch(config.ticketTranscriptChannelId)
        .catch(() => null);
      if (transcript && channel?.isTextBased() && "send" in channel) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`📜 Ticket-Transkript #${ticket.id}`)
          .setDescription(`User: <@${ticket.userId}> · Topic: ${ticket.topic ?? "—"}`)
          .setTimestamp(ticket.closedAt ?? new Date())
          .setFooter({ text: `Geschlossen von ${ticket.closedBy ?? "?"}` });
        await (channel as TextChannel).send({
          embeds: [embed],
          files: [transcript.attachment],
        });
      }
    } catch (err) {
      logger.warn({ err, ticketId }, "Transkript-Post fehlgeschlagen");
    }
  }

  // 2. Rating-DM an den User (nur wenn jemand anderes geschlossen hat)
  if (config.ticketRatingEnabled && ticket.closedBy && ticket.closedBy !== ticket.userId) {
    try {
      const user = await client.users.fetch(ticket.userId).catch(() => null);
      if (user) {
        const embed = new EmbedBuilder()
          .setColor(0xfaa61a)
          .setTitle("⭐ Wie zufrieden warst du mit dem Support?")
          .setDescription(
            `Dein Ticket **#${ticket.id}** wurde geschlossen. Bitte gib uns eine kurze Bewertung — das hilft uns, besser zu werden.`,
          );
        const buttons = [1, 2, 3, 4, 5].map((stars) =>
          new ButtonBuilder()
            .setCustomId(`ticket:rate:${ticket.id}:${stars}`)
            .setLabel("⭐".repeat(stars))
            .setStyle(ButtonStyle.Secondary),
        );
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
        await user.send({ embeds: [embed], components: [row] });
      }
    } catch (err) {
      logger.warn({ err, ticketId }, "Rating-DM fehlgeschlagen (User hat DMs aus?)");
    }
  }
}

// Mod schreibt aus dem Dashboard zurück.
// Cache pro Parent-Channel-ID, damit wir nicht jedes Mal fetchWebhooks() pingen.
const webhookCache = new Map<string, Webhook>();

// Holt oder erstellt einen Webhook im Parent-Channel des Ticket-Threads.
// Webhooks können den Username + Avatar pro Nachricht überschreiben.
async function getOrCreateTicketWebhook(parent: TextChannel): Promise<Webhook | null> {
  const cached = webhookCache.get(parent.id);
  if (cached) return cached;

  try {
    const existing = await parent.fetchWebhooks();
    // Nur Webhooks die der Bot selbst angelegt hat haben einen Token
    const ours = existing.find(
      (w) => w.name === "Ticket-Bot" && w.owner?.id === parent.client.user?.id && w.token,
    );
    if (ours) {
      webhookCache.set(parent.id, ours);
      return ours;
    }
    const created = await parent.createWebhook({
      name: "Ticket-Bot",
      reason: "Wird verwendet um Mod-Antworten in Ticket-Threads mit dem Mod-Namen zu posten",
    });
    webhookCache.set(parent.id, created);
    return created;
  } catch (err) {
    logger.warn(
      { err, channelId: parent.id },
      "Konnte Webhook nicht anlegen — Bot hat keine Manage-Webhooks-Permission?",
    );
    return null;
  }
}

// Sanitisiert den Display-Namen für den Webhook (Discord blockt 'discord' u.ä.)
function safeWebhookUsername(name: string): string {
  let cleaned = name
    .replace(/(discord|clyde)/gi, "$1.")
    .replace(/[^\w\s.\-]/g, "")
    .trim()
    .slice(0, 32);
  if (cleaned.length < 2) cleaned = "Mod";
  return cleaned;
}

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

  // Mod-Avatar aus Member-Tabelle holen (vom Bot synced)
  const modMember = await prisma.member.findUnique({
    where: { userId: args.authorId },
    select: { avatarUrl: true, displayName: true },
  });
  const displayName = modMember?.displayName ?? args.authorName;
  const avatarURL = modMember?.avatarUrl ?? undefined;

  try {
    if (thread.archived) await thread.setArchived(false);

    const parent = thread.parent;
    let posted = false;

    // Variante A: via Webhook → erscheint mit Mod-Name + Avatar (wie normaler User)
    if (parent && parent.isTextBased() && "fetchWebhooks" in parent) {
      const webhook = await getOrCreateTicketWebhook(parent as TextChannel);
      if (webhook) {
        await webhook.send({
          content: args.content,
          username: safeWebhookUsername(displayName),
          avatarURL,
          threadId: thread.id,
          allowedMentions: { parse: ["users", "roles"] },
        });
        posted = true;
      }
    }

    // Variante B: Fallback als Embed (falls Webhook nicht ging, z.B. fehlende Permission)
    if (!posted) {
      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setAuthor({ name: `${displayName} (Mod)`, iconURL: avatarURL })
        .setDescription(args.content)
        .setTimestamp(new Date());
      await thread.send({ embeds: [embed] });
    }
  } catch (err) {
    logger.warn({ err, threadId: thread.id }, "Mod-Reply-Posten fehlgeschlagen");
    return { ok: false, error: "Konnte Nachricht nicht posten." };
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId: args.authorId,
      authorName: displayName,
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

// Validiert ob der User wirklich der Ticket-Owner ist (vor Modal-Anzeige).
export async function handleRatingButton(
  ticketId: number,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, error: "Ticket nicht gefunden." };
  if (ticket.userId !== userId) return { ok: false, error: "Nur der Ticket-Owner kann bewerten." };
  if (ticket.rating !== null) return { ok: false, error: "Du hast bereits bewertet." };
  return { ok: true };
}

// Speichert die Bewertung + postet sie (falls Channel konfiguriert).
export async function handleRatingModal(
  client: Client,
  ticketId: number,
  userId: string,
  stars: number,
  comment: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, error: "Ticket nicht gefunden." };
  if (ticket.userId !== userId) return { ok: false, error: "Nur der Ticket-Owner kann bewerten." };
  if (ticket.rating !== null) return { ok: false, error: "Du hast bereits bewertet." };

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { rating: stars, ratingComment: comment, ratingAt: new Date() },
  });

  // In Rating-Channel posten falls konfiguriert
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  if (config?.ticketRatingEnabled && config.ticketRatingChannelId) {
    try {
      const channel = await client.channels
        .fetch(config.ticketRatingChannelId)
        .catch(() => null);
      if (channel?.isTextBased() && "send" in channel) {
        const color = stars >= 4 ? 0x2ecc71 : stars === 3 ? 0xfaa61a : 0xed4245;
        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`${"⭐".repeat(stars)}${"☆".repeat(5 - stars)} — Ticket #${ticket.id}`)
          .setDescription(
            `User: <@${ticket.userId}>` +
              (ticket.closedBy ? ` · Beraten von: <@${ticket.closedBy}>` : "") +
              (ticket.topic ? `\nTopic: ${ticket.topic}` : ""),
          )
          .setTimestamp(new Date());
        if (comment) embed.addFields({ name: "Kommentar", value: comment });
        await (channel as TextChannel).send({
          embeds: [embed],
          allowedMentions: { parse: [] },
        });
      }
    } catch (err) {
      logger.warn({ err, ticketId }, "Rating-Channel-Post fehlgeschlagen");
    }
  }

  logger.info({ ticketId, stars }, "Ticket-Bewertung abgegeben");
  return { ok: true };
}
