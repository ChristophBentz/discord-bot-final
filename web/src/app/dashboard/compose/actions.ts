"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

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

async function discordId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
}

interface BaseInput {
  channelId: string;
}

export async function sendText(input: BaseInput & { content: string }): Promise<Result> {
  const sentBy = await discordId();
  if (!sentBy) return { ok: false, error: "Nicht eingeloggt." };
  const r = await callBot<unknown>("/api/messages/send", {
    method: "POST",
    body: { type: "text", channelId: input.channelId, content: input.content, sentBy },
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/compose");
  return { ok: true };
}

export async function sendEmbed(
  input: BaseInput & { content?: string; embed: EmbedSpec },
): Promise<Result> {
  const sentBy = await discordId();
  if (!sentBy) return { ok: false, error: "Nicht eingeloggt." };
  const r = await callBot<unknown>("/api/messages/send", {
    method: "POST",
    body: {
      type: "embed",
      channelId: input.channelId,
      content: input.content,
      embed: input.embed,
      sentBy,
    },
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/compose");
  return { ok: true };
}

export async function sendPoll(input: BaseInput & { poll: PollSpec }): Promise<Result> {
  const sentBy = await discordId();
  if (!sentBy) return { ok: false, error: "Nicht eingeloggt." };
  const r = await callBot<unknown>("/api/messages/send", {
    method: "POST",
    body: { type: "poll", channelId: input.channelId, poll: input.poll, sentBy },
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/compose");
  return { ok: true };
}

export async function sendFile(input: {
  channelId: string;
  content?: string;
  fileBase64: string;
  fileName: string;
}): Promise<Result> {
  const sentBy = await discordId();
  if (!sentBy) return { ok: false, error: "Nicht eingeloggt." };
  const r = await callBot<unknown>("/api/messages/send", {
    method: "POST",
    body: {
      type: "file",
      channelId: input.channelId,
      content: input.content,
      fileBase64: input.fileBase64,
      fileName: input.fileName,
      sentBy,
    },
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/compose");
  return { ok: true };
}

export async function editMessage(
  id: number,
  body: { content?: string; embed?: EmbedSpec },
): Promise<Result> {
  const sentBy = await discordId();
  if (!sentBy) return { ok: false, error: "Nicht eingeloggt." };
  const r = await callBot<unknown>(`/api/messages/${id}`, {
    method: "PATCH",
    body,
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/compose");
  return { ok: true };
}

export async function deleteMessage(id: number): Promise<Result> {
  const sentBy = await discordId();
  if (!sentBy) return { ok: false, error: "Nicht eingeloggt." };
  const r = await callBot<unknown>(`/api/messages/${id}`, { method: "DELETE" });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/dashboard/compose");
  return { ok: true };
}
