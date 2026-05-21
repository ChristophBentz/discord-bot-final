"use server";

import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type Result = { ok: true } | { ok: false; error: string };

async function requireAuth(): Promise<Result | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

export async function addWord(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const raw = String(formData.get("word") ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return { ok: false, error: "Wort darf nicht leer sein." };
  if (raw.length > 100) return { ok: false, error: "Max. 100 Zeichen." };

  const session = await getServerSession(authOptions);
  const addedBy = (session?.user as { discordId?: string } | undefined)?.discordId ?? null;

  try {
    await prisma.blacklistedWord.create({
      data: { word: raw, addedBy },
    });
  } catch {
    return { ok: false, error: "Wort steht bereits auf der Liste." };
  }

  revalidatePath("/dashboard/automod");
  return { ok: true };
}

export async function removeWord(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.blacklistedWord.delete({ where: { id } }).catch(() => null);
  revalidatePath("/dashboard/automod");
  return { ok: true };
}

// Extrahiert einen Invite-Code aus URL oder Plain-Code, oder erkennt eine reine Guild-ID.
function parseInput(input: string): { kind: "code"; code: string } | { kind: "guildId"; id: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Reine Guild-ID (Snowflake)
  if (/^\d{17,20}$/.test(trimmed)) return { kind: "guildId", id: trimmed };
  // Invite-Link
  const m = trimmed.match(/(?:discord(?:app)?\.com\/invite|discord\.gg)\/([a-zA-Z0-9-]+)/);
  if (m?.[1]) return { kind: "code", code: m[1] };
  // Plain code
  if (/^[a-zA-Z0-9-]{2,32}$/.test(trimmed)) return { kind: "code", code: trimmed };
  return null;
}

// Löst einen Invite-Code via Discord-API zur Guild-ID + Name auf.
async function resolveInvite(
  code: string,
): Promise<{ ok: true; guildId: string; guildName: string | null } | { ok: false; error: string }> {
  const res = await fetch(
    `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=false&with_expiration=false`,
    { cache: "no-store" },
  );
  if (res.status === 404) return { ok: false, error: "Invite ungültig oder abgelaufen." };
  if (!res.ok) return { ok: false, error: `Discord-API-Fehler (${res.status}).` };
  const data = (await res.json()) as { guild?: { id?: string; name?: string } };
  if (!data.guild?.id) return { ok: false, error: "Invite enthält keinen Server (Group-DM-Invite?)." };
  return { ok: true, guildId: data.guild.id, guildName: data.guild.name ?? null };
}

export async function addWhitelistedInvite(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const raw = String(formData.get("invite") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const parsed = parseInput(raw);
  if (!parsed) {
    return {
      ok: false,
      error: "Bitte einen Invite-Link (discord.gg/…) oder eine Server-ID eingeben.",
    };
  }

  let guildId: string;
  let guildName: string | null;
  if (parsed.kind === "code") {
    const res = await resolveInvite(parsed.code);
    if (!res.ok) return res;
    guildId = res.guildId;
    guildName = res.guildName;
  } else {
    guildId = parsed.id;
    guildName = null; // bei reiner ID kein Auflösungspfad
  }

  const session = await getServerSession(authOptions);
  const addedBy = (session?.user as { discordId?: string } | undefined)?.discordId ?? null;

  try {
    await prisma.whitelistedInvite.create({ data: { guildId, guildName, note, addedBy } });
  } catch {
    return { ok: false, error: "Dieser Server steht bereits auf der Whitelist." };
  }

  revalidatePath("/dashboard/automod");
  return { ok: true };
}

export async function removeWhitelistedInvite(id: number): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.whitelistedInvite.delete({ where: { id } }).catch(() => null);
  revalidatePath("/dashboard/automod");
  return { ok: true };
}

const SNOWFLAKE = /^\d{17,20}$/;

export async function addExcludedChannel(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const channelId = String(formData.get("channelId") ?? "").trim();
  if (!SNOWFLAKE.test(channelId)) {
    return { ok: false, error: "Channel-ID muss eine Snowflake sein (17–20 Ziffern)." };
  }

  const session = await getServerSession(authOptions);
  const addedBy = (session?.user as { discordId?: string } | undefined)?.discordId ?? null;

  try {
    await prisma.autoModExcludedChannel.create({ data: { channelId, addedBy } });
  } catch {
    return { ok: false, error: "Channel ist bereits ausgenommen." };
  }
  revalidatePath("/dashboard/automod");
  return { ok: true };
}

export async function removeExcludedChannel(channelId: string): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.autoModExcludedChannel.delete({ where: { channelId } }).catch(() => null);
  revalidatePath("/dashboard/automod");
  return { ok: true };
}

export async function addBypassRole(roleId: string): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  if (!SNOWFLAKE.test(roleId)) {
    return { ok: false, error: "Rollen-ID ungültig." };
  }
  const session = await getServerSession(authOptions);
  const addedBy = (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
  try {
    await prisma.autoModBypassRole.create({ data: { roleId, addedBy } });
  } catch {
    return { ok: false, error: "Diese Rolle ist bereits ausgenommen." };
  }
  revalidatePath("/dashboard/automod");
  return { ok: true };
}

export async function removeBypassRole(roleId: string): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;
  await prisma.autoModBypassRole.delete({ where: { roleId } }).catch(() => null);
  revalidatePath("/dashboard/automod");
  return { ok: true };
}

export async function saveAutoModSettings(formData: FormData): Promise<Result> {
  const auth = await requireAuth();
  if (auth) return auth;

  const enabled = formData.get("autoModEnabled") === "on";
  const dm = formData.get("autoModDM") === "on";
  const bypassMods = formData.get("autoModBypassMods") === "on";
  const blockInvites = formData.get("autoModBlockInvites") === "on";
  const massMentionEnabled = formData.get("autoModMassMentionEnabled") === "on";
  const massMentionRaw = Number(formData.get("autoModMassMentionLimit") ?? 5);
  const massMentionLimit = Number.isFinite(massMentionRaw)
    ? Math.max(1, Math.min(50, Math.floor(massMentionRaw)))
    : 5;
  const spamEnabled = formData.get("autoModSpamEnabled") === "on";
  const clampInt = (v: FormDataEntryValue | null, fb: number, min: number, max: number) => {
    const n = Number(v ?? fb);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fb;
  };
  const spamMessages = clampInt(formData.get("autoModSpamMessages"), 5, 2, 50);
  const spamSeconds = clampInt(formData.get("autoModSpamSeconds"), 5, 1, 120);
  const spamTimeoutMinutes = clampInt(formData.get("autoModSpamTimeoutMinutes"), 5, 1, 1440);
  const exclusionsEnabled = formData.get("autoModExcludedChannelsEnabled") === "on";

  const data = {
    autoModEnabled: enabled,
    autoModDM: dm,
    autoModBypassMods: bypassMods,
    autoModBlockInvites: blockInvites,
    autoModMassMentionEnabled: massMentionEnabled,
    autoModMassMentionLimit: massMentionLimit,
    autoModSpamEnabled: spamEnabled,
    autoModSpamMessages: spamMessages,
    autoModSpamSeconds: spamSeconds,
    autoModSpamTimeoutMinutes: spamTimeoutMinutes,
    autoModExcludedChannelsEnabled: exclusionsEnabled,
  };

  await prisma.config.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  revalidatePath("/dashboard/automod");
  return { ok: true };
}
