import type { Client, TextChannel } from "discord.js";
import {
  AttachmentBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { prisma } from "@repo/db";

export interface EmbedSpec {
  title?: string;
  description?: string;
  color?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  footerText?: string;
  url?: string;
}

export interface PollSpec {
  question: string;
  answers: { text: string; emoji?: string }[];
  durationHours: number;
  allowMultiselect: boolean;
}

export interface SendBody {
  channelId?: string;
  type?: "text" | "embed" | "poll" | "file";
  content?: string;
  embed?: EmbedSpec;
  poll?: PollSpec;
  fileBase64?: string;
  fileName?: string;
  sentBy?: string;
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

function buildEmbedFromSpec(spec: EmbedSpec): EmbedBuilder {
  const e = new EmbedBuilder();
  if (spec.title) e.setTitle(spec.title);
  if (spec.url) e.setURL(spec.url);
  if (spec.description) e.setDescription(spec.description);
  if (typeof spec.color === "number") e.setColor(spec.color);
  if (spec.imageUrl) e.setImage(spec.imageUrl);
  if (spec.thumbnailUrl) e.setThumbnail(spec.thumbnailUrl);
  if (spec.footerText) e.setFooter({ text: spec.footerText });
  return e;
}

async function ensureSendableChannel(
  client: Client,
  channelId: string,
): Promise<{ ok: true; channel: TextChannel } | { ok: false; error: string }> {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    return { ok: false, error: "Channel nicht gefunden oder nicht beschreibbar." };
  }
  const me = "guild" in channel ? channel.guild?.members.me : null;
  if (me && "permissionsFor" in channel) {
    const perms = (channel as TextChannel).permissionsFor(me);
    if (!perms?.has(PermissionFlagsBits.SendMessages)) {
      return { ok: false, error: "Bot hat keine Send-Permission in diesem Channel." };
    }
  }
  return { ok: true, channel: channel as TextChannel };
}

export async function handleSendMessage(
  client: Client,
  body: SendBody,
): Promise<Result<{ messageId: string; channelId: string }>> {
  const channelId = body.channelId ?? "";
  if (!/^\d{17,20}$/.test(channelId)) return { ok: false, error: "Ungültige Channel-ID." };
  const type = body.type;
  if (!type) return { ok: false, error: "type fehlt." };

  const c = await ensureSendableChannel(client, channelId);
  if (!c.ok) return c;
  const channel = c.channel;

  try {
    if (type === "text") {
      const content = (body.content ?? "").trim();
      if (!content) return { ok: false, error: "Text ist leer." };
      if (content.length > 5000) return { ok: false, error: "Text > 5000 Zeichen." };

      // Discord-Limit ist 2000 Zeichen pro Nachricht → automatisch chunken.
      const chunks = chunkMessage(content, 2000);
      let firstMessageId = "";
      for (let i = 0; i < chunks.length; i += 1) {
        const isFirst = i === 0;
        const msg = await channel.send({
          content: chunks[i],
          // Nur in der ersten Chunk gepingt — sonst spamen wir den Rollen-Ping mehrfach.
          allowedMentions: isFirst ? { parse: ["users", "roles"] } : { parse: [] },
        });
        if (isFirst) firstMessageId = msg.id;
        await prisma.botMessage.create({
          data: {
            channelId,
            messageId: msg.id,
            type,
            content: chunks[i] ?? null,
            sentBy: body.sentBy ?? null,
          },
        });
      }
      return { ok: true, messageId: firstMessageId, channelId };
    }

    if (type === "embed") {
      if (!body.embed) return { ok: false, error: "embed fehlt." };
      const embed = buildEmbedFromSpec(body.embed);
      const optionalContent = (body.content ?? "").trim() || undefined;
      const msg = await channel.send({
        content: optionalContent,
        embeds: [embed],
        allowedMentions: { parse: ["users", "roles"] },
      });
      await prisma.botMessage.create({
        data: {
          channelId,
          messageId: msg.id,
          type,
          content: optionalContent ?? null,
          embedJson: JSON.stringify(body.embed),
          sentBy: body.sentBy ?? null,
        },
      });
      return { ok: true, messageId: msg.id, channelId };
    }

    if (type === "poll") {
      if (!body.poll) return { ok: false, error: "poll fehlt." };
      const p = body.poll;
      const question = p.question.trim();
      const answers = (p.answers ?? [])
        .map((a) => ({ text: a.text.trim(), emoji: a.emoji?.trim() || undefined }))
        .filter((a) => a.text);
      if (!question) return { ok: false, error: "Frage ist leer." };
      if (question.length > 300) return { ok: false, error: "Frage > 300 Zeichen." };
      if (answers.length < 2) return { ok: false, error: "Mindestens 2 Antworten." };
      if (answers.length > 10) return { ok: false, error: "Max. 10 Antworten." };
      if (answers.some((a) => a.text.length > 55))
        return { ok: false, error: "Antwort > 55 Zeichen." };
      const duration = Math.min(768, Math.max(1, Math.floor(p.durationHours)));
      const msg = await channel.send({
        poll: {
          question: { text: question },
          answers: answers.map((a) => ({
            text: a.text,
            ...(a.emoji ? { emoji: a.emoji } : {}),
          })),
          duration,
          allowMultiselect: Boolean(p.allowMultiselect),
        },
      });
      await prisma.botMessage.create({
        data: {
          channelId,
          messageId: msg.id,
          type,
          content: question,
          pollJson: JSON.stringify(p),
          sentBy: body.sentBy ?? null,
        },
      });
      return { ok: true, messageId: msg.id, channelId };
    }

    if (type === "file") {
      if (!body.fileBase64 || !body.fileName)
        return { ok: false, error: "fileBase64/fileName fehlen." };
      const buf = Buffer.from(body.fileBase64, "base64");
      if (buf.length > 8 * 1024 * 1024)
        return { ok: false, error: "Datei > 8 MB (Limit für Standard-Discord)." };
      const file = new AttachmentBuilder(buf, { name: body.fileName });
      const optionalContent = (body.content ?? "").trim() || undefined;
      const msg = await channel.send({
        content: optionalContent,
        files: [file],
        allowedMentions: { parse: ["users", "roles"] },
      });
      await prisma.botMessage.create({
        data: {
          channelId,
          messageId: msg.id,
          type,
          content: optionalContent ?? null,
          fileName: body.fileName,
          sentBy: body.sentBy ?? null,
        },
      });
      return { ok: true, messageId: msg.id, channelId };
    }

    return { ok: false, error: `Unbekannter type: ${type}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface EditBody {
  content?: string;
  embed?: EmbedSpec;
}

export async function handleEditMessage(
  client: Client,
  id: number,
  body: EditBody,
): Promise<Result<{ messageId: string }>> {
  const row = await prisma.botMessage.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Nachricht nicht in der Datenbank." };
  if (row.type === "poll") return { ok: false, error: "Polls können nicht bearbeitet werden." };
  if (row.type === "file") return { ok: false, error: "Datei-Nachrichten können nicht bearbeitet werden." };

  const c = await ensureSendableChannel(client, row.channelId);
  if (!c.ok) return c;
  const channel = c.channel;
  const msg = await channel.messages.fetch(row.messageId).catch(() => null);
  if (!msg) return { ok: false, error: "Discord-Nachricht nicht gefunden (gelöscht?)." };

  try {
    if (row.type === "text") {
      const content = (body.content ?? "").trim();
      if (!content) return { ok: false, error: "Text ist leer." };
      if (content.length > 2000) return { ok: false, error: "Text > 2000 Zeichen." };
      await msg.edit({ content, allowedMentions: { parse: ["users", "roles"] } });
      await prisma.botMessage.update({
        where: { id },
        data: { content, editedAt: new Date() },
      });
      return { ok: true, messageId: msg.id };
    }
    if (row.type === "embed") {
      if (!body.embed) return { ok: false, error: "embed fehlt." };
      const embed = buildEmbedFromSpec(body.embed);
      const optionalContent = (body.content ?? "").trim() || null;
      await msg.edit({
        content: optionalContent ?? "",
        embeds: [embed],
        allowedMentions: { parse: ["users", "roles"] },
      });
      await prisma.botMessage.update({
        where: { id },
        data: {
          content: optionalContent,
          embedJson: JSON.stringify(body.embed),
          editedAt: new Date(),
        },
      });
      return { ok: true, messageId: msg.id };
    }
    return { ok: false, error: `Type nicht editierbar: ${row.type}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function handleDeleteMessage(
  client: Client,
  id: number,
): Promise<Result<unknown>> {
  const row = await prisma.botMessage.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Nachricht nicht in der Datenbank." };

  try {
    const channel = await client.channels.fetch(row.channelId).catch(() => null);
    if (channel?.isTextBased() && "messages" in channel) {
      const msg = await (channel as TextChannel).messages.fetch(row.messageId).catch(() => null);
      if (msg) await msg.delete().catch(() => null);
    }
  } catch {
    /* ignore — Discord-side may already be gone */
  }

  await prisma.botMessage.delete({ where: { id } }).catch(() => null);
  return { ok: true };
}

// Splittet Content in Stücke max. {maxChars} Zeichen, möglichst an Absatz-,
// Zeilen- oder Wort-Grenzen statt mitten im Wort.
function chunkMessage(content: string, maxChars: number): string[] {
  if (content.length <= maxChars) return [content];
  const chunks: string[] = [];
  let remaining = content;
  while (remaining.length > maxChars) {
    // Try paragraph break first, then line, then word, then hard cut
    let cut = remaining.lastIndexOf("\n\n", maxChars);
    if (cut < maxChars / 2) cut = remaining.lastIndexOf("\n", maxChars);
    if (cut < maxChars / 2) cut = remaining.lastIndexOf(" ", maxChars);
    if (cut < maxChars / 2) cut = maxChars;
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
