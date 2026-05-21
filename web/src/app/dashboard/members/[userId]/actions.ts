"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_NOTE_LENGTH = 1000;

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
