import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getConfig } from "@repo/db";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

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
