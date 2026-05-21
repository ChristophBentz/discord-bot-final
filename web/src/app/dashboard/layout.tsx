import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getConfig, prisma } from "@repo/db";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  // Per-Request-Re-Check: wenn die Mod-Rolle entzogen wird, sperrt das beim nächsten
  // Pageload aus (ohne erst auf JWT-Expiry zu warten).
  const discordId = (session.user as { discordId?: string } | undefined)?.discordId;
  const ownerId = process.env.OWNER_DISCORD_ID;
  if (discordId && discordId !== ownerId) {
    const member = await prisma.member.findUnique({
      where: { userId: discordId },
      select: { isProtected: true, inServer: true },
    });
    if (!member?.inServer || !member.isProtected) redirect("/?denied=1");
  }

  const config = await getConfig();
  const serverName = config.guildName ?? "Mein Server";
  const memberCount = config.guildMemberCount;
  const serverIconUrl = config.guildIconUrl;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        serverName={serverName}
        memberCount={memberCount}
        serverIconUrl={serverIconUrl}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar serverName={serverName} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
