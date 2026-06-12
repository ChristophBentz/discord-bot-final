import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getConfig } from "@repo/db";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { resolveAccent } from "@/lib/accent";
import { canAccessDashboard } from "@/lib/access";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  // Per-Request-Re-Check: greift sofort beim nächsten Pageload, wenn die
  // Mod-Rolle entzogen oder die Allowlist geändert wird (ohne JWT-Expiry).
  const discordId = (session.user as { discordId?: string } | undefined)?.discordId;
  const ownerId = process.env.OWNER_DISCORD_ID;
  const isOwner = Boolean(discordId && ownerId && discordId === ownerId);
  if (!(await canAccessDashboard(discordId))) redirect("/?denied=1");

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
        accent={resolveAccent(config.accentFrom, config.accentTo)}
        isOwner={isOwner}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar serverName={serverName} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
