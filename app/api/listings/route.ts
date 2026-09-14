import { NextResponse } from "next/server";
import { createListing, getUserBySteamId } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  const user = await getUserBySteamId(session.steamId);
  if (!user) return NextResponse.json({ error: "ItemFuse profile not found." }, { status: 404 });

  try {
    const body = await request.json() as {
      inventoryItemId?: number;
      wantedMarketHashName?: string;
      wantedExterior?: string | null;
      tolerancePercent?: number;
      notes?: string | null;
    };
    const itemId = Number(body.inventoryItemId);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "Choose a valid inventory item." }, { status: 400 });
    }

    const listingId = await createListing({
      userId: user.id,
      inventoryItemId: itemId,
      wantedMarketHashName: String(body.wantedMarketHashName ?? "*").trim() || "*",
      wantedExterior: body.wantedExterior ? String(body.wantedExterior) : null,
      tolerancePercent: Number(body.tolerancePercent ?? 5),
      notes: body.notes ? String(body.notes).slice(0, 1000) : null
    });
    return NextResponse.json({ ok: true, listingId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create listing." }, { status: 400 });
  }
}
