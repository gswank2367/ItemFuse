import { NextResponse } from "next/server";
import { createTradeOffer, getUserBySteamId } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  const user = await getUserBySteamId(session.steamId);
  if (!user) return NextResponse.json({ error: "ItemFuse profile not found." }, { status: 404 });

  try {
    const body = await request.json() as {
      listingId?: number;
      otherUserId?: number;
      initiatorItemIds?: number[];
      otherItemIds?: number[];
      note?: string | null;
      parentOfferId?: number | null;
    };
    const listingId = Number(body.listingId);
    const otherUserId = Number(body.otherUserId);
    if (!Number.isInteger(listingId) || listingId <= 0 || !Number.isInteger(otherUserId) || otherUserId <= 0) {
      return NextResponse.json({ error: "Invalid offer target." }, { status: 400 });
    }
    const offerId = await createTradeOffer({
      initiatorUserId: user.id,
      otherUserId,
      listingId,
      initiatorItemIds: Array.isArray(body.initiatorItemIds) ? body.initiatorItemIds.map(Number) : [],
      otherItemIds: Array.isArray(body.otherItemIds) ? body.otherItemIds.map(Number) : [],
      note: body.note ? String(body.note).slice(0, 1000) : null,
      parentOfferId: body.parentOfferId ? Number(body.parentOfferId) : null,
    });
    return NextResponse.json({ ok: true, offerId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create offer." }, { status: 400 });
  }
}
