"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SNOWFLAKE = /^\d{17,20}$/;

export type Result = { ok: true } | { ok: false; error: string };

async function requireAuth(): Promise<Result | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

export async function saveWelcomeSettings(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const welcomeEnabled = formData.get("welcomeEnabled") === "on";
  const leaveEnabled = formData.get("leaveEnabled") === "on";
  const autoRolesEnabled = formData.get("autoRolesEnabled") === "on";

  const welcomeChannel = String(formData.get("welcomeChannelId") ?? "").trim();
  if (welcomeChannel && !SNOWFLAKE.test(welcomeChannel)) {
    return { ok: false, error: "Welcome-Channel-ID muss eine Snowflake sein." };
  }
  const leaveChannel = String(formData.get("leaveChannelId") ?? "").trim();
  if (leaveChannel && !SNOWFLAKE.test(leaveChannel)) {
    return { ok: false, error: "Leave-Channel-ID muss eine Snowflake sein." };
  }

  const welcomeMessage = String(formData.get("welcomeMessage") ?? "").trim() || null;
  const leaveMessage = String(formData.get("leaveMessage") ?? "").trim() || null;

  if (welcomeMessage && welcomeMessage.length > 1500) {
    return { ok: false, error: "Welcome-Message max. 1500 Zeichen." };
  }
  if (leaveMessage && leaveMessage.length > 1500) {
    return { ok: false, error: "Leave-Message max. 1500 Zeichen." };
  }

  const data = {
    welcomeEnabled,
    welcomeChannelId: welcomeChannel === "" ? null : welcomeChannel,
    welcomeMessage,
    leaveEnabled,
    leaveChannelId: leaveChannel === "" ? null : leaveChannel,
    leaveMessage,
    autoRolesEnabled,
  };

  await prisma.config.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  revalidatePath("/dashboard/welcome");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function addAutoRole(roleId: string): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  if (!/^\d{17,20}$/.test(roleId)) return { ok: false, error: "Ungültige Rollen-ID." };
  try {
    await prisma.autoRole.create({ data: { roleId } });
  } catch {
    return { ok: false, error: "Rolle ist bereits Auto-Rolle." };
  }
  revalidatePath("/dashboard/welcome");
  return { ok: true };
}

export async function removeAutoRole(roleId: string): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.autoRole.delete({ where: { roleId } }).catch(() => null);
  revalidatePath("/dashboard/welcome");
  return { ok: true };
}
