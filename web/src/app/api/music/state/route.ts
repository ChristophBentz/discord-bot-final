import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callBot } from "@/lib/botApi";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const r = await callBot<{ state: unknown }>("/api/music/state", { method: "GET" });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, state: r.data.state });
}
