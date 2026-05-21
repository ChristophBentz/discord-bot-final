import type { AuthOptions } from "next-auth";
import DiscordProvider, { type DiscordProfile } from "next-auth/providers/discord";
import { prisma } from "@repo/db";

const ownerId = process.env.OWNER_DISCORD_ID;

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
      if (!discordId) return false;
      // Owner darf immer rein (Notfall-Zugang, falls Member-Sync nicht aktuell ist).
      if (ownerId && discordId === ownerId) return true;
      // Sonst: aktives Mitglied auf dem Server mit Admin/Mod-Rolle.
      // isProtected wird vom Bot gesetzt für: Owner, Administrator, KickMembers,
      // BanMembers oder ModerateMembers Permission.
      const member = await prisma.member.findUnique({
        where: { userId: discordId },
        select: { isProtected: true, inServer: true },
      });
      return Boolean(member?.inServer && member?.isProtected);
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
