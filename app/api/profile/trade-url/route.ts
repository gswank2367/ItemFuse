import { NextResponse } from "next/server";
import { getUserBySteamId, updateTradeUrl } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  const user = await getUserBySteamId(session.steamId);
  if (!user) return NextResponse.json({ error: "ItemFuse profile not found." }, { status: 404 });

  const body = await request.json() as { tradeUrl?: string };
  const value = String(body.tradeUrl ?? "").trim();
  if (!value) {
    await updateTradeUrl(user.id, null);
    return NextResponse.json({ ok: true });
  }

  let url: URL;
  try { url = new URL(value); } catch { return NextResponse.json({ error: "Enter a valid Steam Trade Offer URL." }, { status: 400 }); }
  if (url.protocol !== "https:" || url.hostname !== "steamcommunity.com" || url.pathname !== "/tradeoffer/new/") {
    return NextResponse.json({ error: "Use your Steam Trade Offer URL from steamcommunity.com/tradeoffer/new/." }, { status: 400 });
  }
  if (!url.searchParams.get("partner") || !url.searchParams.get("token")) {
    return NextResponse.json({ error: "That Steam Trade Offer URL is missing its partner or token value." }, { status: 400 });
  }

  await updateTradeUrl(user.id, url.toString());
  return NextResponse.json({ ok: true });
}
