import type { AuthOptions } from "next-auth";
import DiscordProvider, { type DiscordProfile } from "next-auth/providers/discord";
import { canAccessDashboard } from "@/lib/access";

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
      const discordId = (profile as DiscordProfile | undefined)?.id;
      // Zentrale Zugangsregel (inkl. optionaler Owner-Allowlist).
      return canAccessDashboard(discordId);
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
