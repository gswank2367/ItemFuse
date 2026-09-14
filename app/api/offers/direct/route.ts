import { NextResponse } from "next/server";
import { createDirectTradeOffer, getUserBySteamId } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getSteamFriends } from "@/lib/steam";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  const user = await getUserBySteamId(session.steamId);
  if (!user) return NextResponse.json({ error: "ItemFuse profile not found." }, { status: 404 });

  try {
    const body = await request.json() as {
      otherSteamId?: string;
      initiatorItemIds?: number[];
      otherItemIds?: number[];
      note?: string | null;
    };
    const otherSteamId = String(body.otherSteamId ?? "").trim();
    if (!/^\d{17}$/.test(otherSteamId)) {
      return NextResponse.json({ error: "Invalid Steam friend." }, { status: 400 });
    }

    const friends = await getSteamFriends(session.steamId);
    if (!friends.some((friend) => friend.steamId === otherSteamId)) {
      return NextResponse.json({ error: "That Steam account is not in your current public friends list." }, { status: 403 });
    }

    const otherUser = await getUserBySteamId(otherSteamId);
    if (!otherUser) {
      return NextResponse.json({ error: "That friend has not joined ItemFuse yet." }, { status: 400 });
    }

    const offerId = await createDirectTradeOffer({
      initiatorUserId: user.id,
      otherUserId: otherUser.id,
      initiatorItemIds: Array.isArray(body.initiatorItemIds) ? body.initiatorItemIds.map(Number) : [],
      otherItemIds: Array.isArray(body.otherItemIds) ? body.otherItemIds.map(Number) : [],
      note: body.note ? String(body.note).slice(0, 1000) : null,
    });

    return NextResponse.json({ ok: true, offerId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create direct offer." }, { status: 400 });
  }
}
