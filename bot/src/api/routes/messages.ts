import type { Client, TextChannel } from "discord.js";
import {
  AttachmentBuilder,
  ContainerBuilder,
  EmbedBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
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

// Ein Bild im Bild-Block: entweder eine externe URL oder eine hochgeladene
// Datei (base64), die als Attachment mitgeschickt und per attachment:// referenziert wird.
export type BlockImage =
  | { kind: "url"; url: string }
  | { kind: "upload"; fileName: string; dataBase64: string };

// Baukasten-Nachricht (Discord Components V2): frei stapelbare Blöcke.
export type MessageBlock =
  | { type: "text"; content: string }
  | { type: "image"; images: BlockImage[] } // 1–10 Bilder als Galerie
  | { type: "separator"; large?: boolean };

export interface BlocksSpec {
  blocks: MessageBlock[];
  // Optional: alles in einen Container mit farbiger Akzentleiste packen.
  accentColor?: number | null;
}

export interface SendBody {
  channelId?: string;
  type?: "text" | "embed" | "poll" | "file" | "blocks";
  content?: string;
  embed?: EmbedSpec;
  poll?: PollSpec;
  blocks?: BlocksSpec;
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

// Erstellt ein oder mehrere Embeds aus einem Spec — splittet die Description
// in mehrere Embeds wenn sie über das Discord-Limit (4096) geht.
// Title/Color/Image/Footer landen NUR im ersten Embed, weitere sind reine
// Description-Continuation-Embeds in der gleichen Discord-Message.
function buildEmbedsFromSpec(spec: EmbedSpec): EmbedBuilder[] {
  const description = spec.description ?? "";
  const chunks = description ? chunkMessage(description, 4096) : [""];

  return chunks.map((chunk, i) => {
    const e = new EmbedBuilder();
    if (chunk) e.setDescription(chunk);
    if (typeof spec.color === "number") e.setColor(spec.color);
    // Erste Embed bekommt alle Metadaten
    if (i === 0) {
      if (spec.title) e.setTitle(spec.title);
      if (spec.url) e.setURL(spec.url);
      if (spec.thumbnailUrl) e.setThumbnail(spec.thumbnailUrl);
    }
    // Letzte Embed bekommt Bild + Footer (damit alles am Ende zusammen erscheint)
    if (i === chunks.length - 1) {
      if (spec.imageUrl) e.setImage(spec.imageUrl);
      if (spec.footerText) e.setFooter({ text: spec.footerText });
    }
    return e;
  });
}

const HTTP_URL = /^https?:\/\/\S+$/i;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB pro Datei (Standard-Discord)
const MAX_TOTAL_UPLOAD_BYTES = 25 * 1024 * 1024; // Gesamt-Limit der Nachricht

// Validiert eine BlocksSpec und liefert eine Fehlermeldung oder null.
function validateBlocks(spec: BlocksSpec): string | null {
  const blocks = spec.blocks ?? [];
  if (blocks.length === 0) return "Keine Blöcke vorhanden.";
  if (blocks.length > 25) return "Max. 25 Blöcke pro Nachricht.";

  let totalText = 0;
  let totalUploadBytes = 0;
  let hasContent = false;
  for (const b of blocks) {
    if (b.type === "text") {
      const content = b.content.trim();
      if (!content) return "Ein Text-Block ist leer.";
      totalText += content.length;
      hasContent = true;
    } else if (b.type === "image") {
      const images = b.images ?? [];
      if (images.length === 0) return "Ein Bild-Block ist leer.";
      if (images.length > 10) return "Max. 10 Bilder pro Bild-Block.";
      for (const img of images) {
        if (img.kind === "url") {
          if (!HTTP_URL.test(img.url)) return `Ungültige Bild-URL: ${img.url.slice(0, 60)}`;
        } else {
          if (!img.dataBase64 || !img.fileName) return "Hochgeladenes Bild ist unvollständig.";
          const bytes = Math.floor((img.dataBase64.length * 3) / 4);
          if (bytes > MAX_UPLOAD_BYTES) return `Bild „${img.fileName}" ist größer als 8 MB.`;
          totalUploadBytes += bytes;
        }
      }
      hasContent = true;
    }
  }
  if (!hasContent) return "Nachricht braucht mindestens einen Text- oder Bild-Block.";
  if (totalText > 4000) return `Zu viel Text: ${totalText} / 4000 Zeichen.`;
  if (totalUploadBytes > MAX_TOTAL_UPLOAD_BYTES) return "Hochgeladene Bilder zusammen über 25 MB.";
  return null;
}

// Baut Components + die nötigen Attachments. Hochgeladene Bilder werden als
// AttachmentBuilder beigelegt und im Gallery-Item via attachment://<name> referenziert.
function buildBlockComponents(spec: BlocksSpec): {
  components: ReturnType<typeof makeComponents>;
  files: AttachmentBuilder[];
} {
  const files: AttachmentBuilder[] = [];
  let uploadIdx = 0;

  // Eindeutiger Attachment-Name pro Upload (Discord verlangt Eindeutigkeit).
  const attachImage = (img: Extract<BlockImage, { kind: "upload" }>): string => {
    const ext = (img.fileName.split(".").pop() ?? "png").replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
    const name = `block-${uploadIdx++}.${ext}`;
    files.push(new AttachmentBuilder(Buffer.from(img.dataBase64, "base64"), { name }));
    return `attachment://${name}`;
  };

  const galleryUrl = (img: BlockImage) => (img.kind === "url" ? img.url : attachImage(img));

  const components = makeComponents(spec, galleryUrl);
  return { components, files };
}

function makeComponents(spec: BlocksSpec, galleryUrl: (img: BlockImage) => string) {
  const toBuilder = (b: MessageBlock) => {
    if (b.type === "text") return new TextDisplayBuilder().setContent(b.content.trim());
    if (b.type === "image") {
      const gallery = new MediaGalleryBuilder();
      for (const img of b.images) {
        gallery.addItems(new MediaGalleryItemBuilder().setURL(galleryUrl(img)));
      }
      return gallery;
    }
    return new SeparatorBuilder()
      .setSpacing(b.large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small)
      .setDivider(true);
  };

  if (typeof spec.accentColor === "number") {
    const container = new ContainerBuilder().setAccentColor(spec.accentColor);
    for (const block of spec.blocks) {
      const built = toBuilder(block);
      if (built instanceof TextDisplayBuilder) container.addTextDisplayComponents(built);
      else if (built instanceof MediaGalleryBuilder) container.addMediaGalleryComponents(built);
      else if (built instanceof SeparatorBuilder) container.addSeparatorComponents(built);
    }
    return [container];
  }
  return spec.blocks.map(toBuilder);
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
      const optionalContent = (body.content ?? "").trim() || undefined;
      const embeds = buildEmbedsFromSpec(body.embed);
      if (embeds.length === 0) return { ok: false, error: "Embed ist leer." };
      if (embeds.length > 10) {
        return { ok: false, error: "Beschreibung zu lang — max. 10 Embeds (~40000 Zeichen)." };
      }
      const msg = await channel.send({
        content: optionalContent,
        embeds,
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

    if (type === "blocks") {
      if (!body.blocks) return { ok: false, error: "blocks fehlt." };
      const invalid = validateBlocks(body.blocks);
      if (invalid) return { ok: false, error: invalid };

      const { components, files } = buildBlockComponents(body.blocks);
      const msg = await channel.send({
        components,
        files: files.length > 0 ? files : undefined,
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: ["users", "roles"] },
      });

      // Für die History: base64-Daten NICHT speichern (würde die DB aufblähen).
      // Hochgeladene Bilder durch ihre Discord-CDN-URL ersetzen.
      const cdnUrls = [...msg.attachments.values()].map((a) => a.url);
      let cdnIdx = 0;
      const storedBlocks = body.blocks.blocks.map((b) => {
        if (b.type !== "image") return b;
        return {
          ...b,
          images: b.images.map((img) =>
            img.kind === "upload"
              ? { kind: "url" as const, url: cdnUrls[cdnIdx++] ?? "" }
              : img,
          ),
        };
      });

      await prisma.botMessage.create({
        data: {
          channelId,
          messageId: msg.id,
          type,
          // Erster Text-Block als Kurz-Anzeige für die History.
          content:
            body.blocks.blocks
              .find((b): b is Extract<MessageBlock, { type: "text" }> => b.type === "text")
              ?.content.slice(0, 200) ?? null,
          blocksJson: JSON.stringify({ ...body.blocks, blocks: storedBlocks }),
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
      const embeds = buildEmbedsFromSpec(body.embed);
      if (embeds.length > 10) {
        return { ok: false, error: "Beschreibung zu lang — max. 10 Embeds (~40000 Zeichen)." };
      }
      const optionalContent = (body.content ?? "").trim() || null;
      await msg.edit({
        content: optionalContent ?? "",
        embeds,
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
