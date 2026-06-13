"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { verifyProfileToken } from "@/lib/profileToken";

// Owner-Verifikation per Magic-Link-Token (für alle Profil-Settings).
async function verifyOwner(
  userId: string,
  key: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^\d{17,20}$/.test(userId)) return { ok: false, error: "Ungültige ID" };
  const member = await prisma.member.findUnique({
    where: { userId },
    select: { profileTokenVersion: true },
  });
  if (!member) return { ok: false, error: "User nicht gefunden" };
  if (!verifyProfileToken(userId, member.profileTokenVersion, key)) {
    return { ok: false, error: "Token ungültig — hol dir einen neuen mit /profil reset" };
  }
  return { ok: true };
}

export async function setProfileVisibility(
  userId: string,
  key: string,
  isPublic: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await verifyOwner(userId, key);
  if (!auth.ok) return auth;
  await prisma.member.update({ where: { userId }, data: { profilePublic: isPublic } });
  revalidatePath(`/u/${userId}`);
  return { ok: true };
}

export type BirthdayPrivacyKey = "birthdayShow" | "birthdayShowAge" | "birthdayAnnounce";

export async function setBirthdayPrivacy(
  userId: string,
  key: string,
  field: BirthdayPrivacyKey,
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await verifyOwner(userId, key);
  if (!auth.ok) return auth;
  await prisma.member.update({ where: { userId }, data: { [field]: value } });
  revalidatePath(`/u/${userId}`);
  return { ok: true };
}
