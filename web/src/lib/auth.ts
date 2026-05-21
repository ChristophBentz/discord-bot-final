import type { AuthOptions } from "next-auth";
import DiscordProvider, { type DiscordProfile } from "next-auth/providers/discord";

const ownerId = process.env.OWNER_DISCORD_ID;
if (!ownerId) {
  console.warn(
    "[auth] OWNER_DISCORD_ID ist nicht gesetzt — niemand wird sich einloggen können.",
  );
}

export const authOptions: AuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "identify" } },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // Single-Guild-Setup: nur der konfigurierte Owner darf rein.
      if (!ownerId) return false;
      return (profile as DiscordProfile | undefined)?.id === ownerId;
    },
    async jwt({ token, profile }) {
      const discordProfile = profile as DiscordProfile | undefined;
      if (discordProfile?.id) token.discordId = discordProfile.id;
      return token;
    },
    async session({ session, token }) {
      if (token.discordId && session.user) {
        (session.user as { discordId?: string }).discordId = token.discordId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
