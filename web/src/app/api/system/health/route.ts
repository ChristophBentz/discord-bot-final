import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export const dynamic = "force-dynamic";

export async function GET() {
  // Admin-Gate — Health-Daten gehen niemanden was an außer Mods
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const res = await callBot<unknown>("/api/system/health", { method: "GET" });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json(res.data);
}
