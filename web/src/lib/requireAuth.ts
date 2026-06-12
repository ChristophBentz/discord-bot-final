import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Stellt sicher, dass die aufrufende Server-Action von einem eingeloggten
 * Dashboard-User kommt. Da der NextAuth-signIn-Gate (lib/auth.ts) nur
 * Mitglieder mit Mod-Rolle oder den Owner durchlässt, ist eine vorhandene
 * Session gleichbedeutend mit „berechtigter Mod".
 *
 * Wichtig: Server-Actions sind eigenständige Endpoints ohne Middleware —
 * jede mutierende Action MUSS das hier (oder einen strengeren Check) aufrufen.
 */
export async function requireAuth(): Promise<{ ok: false; error: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Nicht eingeloggt." };
  return null;
}

/** Discord-ID des eingeloggten Users (oder null). */
export async function sessionDiscordId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { discordId?: string } | undefined)?.discordId ?? null;
}
