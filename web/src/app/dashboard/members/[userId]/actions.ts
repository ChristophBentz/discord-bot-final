"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

const MAX_NOTE_LENGTH = 1000;

const SNOWFLAKE = /^\d{17,20}$/;

/**
 * Banner + Accent-Color vom Bot/Discord nachladen. Läuft NICHT mehr im
 * Seiten-Render (das war ein blockierender 30s-POST), sondern wird vom
 * BannerRefresher-Client nach dem Mount im Hintergrund ausgelöst.
 */
export async function refreshMemberBanner(userId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return;
  if (!SNOWFLAKE.test(userId)) return;
  const res = await callBot(`/api/members/${userId}/refresh-profile`, { method: "POST" });
  if (res.ok) revalidatePath(`/dashboard/members/${userId}`);
}

export type NoteResult = { ok: true } | { ok: false; error: string };

export async function addMemberNote(userId: string, formData: FormData): Promise<NoteResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { ok: false, error: "Notiz darf nicht leer sein." };
  if (content.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Maximal ${MAX_NOTE_LENGTH} Zeichen.` };
  }

  const authorId =
    (session.user as { discordId?: string }).discordId ?? session.user.name ?? "unknown";
  const authorName = session.user.name ?? "Staff";

  await prisma.memberNote.create({
    data: { userId, authorId, authorName, content },
  });

  revalidatePath(`/dashboard/members/${userId}`);
  return { ok: true };
}

export async function deleteMemberNote(noteId: number, userId: string): Promise<NoteResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };

  await prisma.memberNote.delete({ where: { id: noteId } });
  revalidatePath(`/dashboard/members/${userId}`);
  return { ok: true };
}
