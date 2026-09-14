import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserBySteamId, updateInventoryHistoryCalibration } from "@/lib/db";
import { fetchHistoricalCalibration } from "@/lib/market-history";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });

  const user = await getUserBySteamId(session.steamId);
  if (!user) return NextResponse.json({ error: "ItemFuse profile not found." }, { status: 404 });

  const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";
  const phase = request.nextUrl.searchParams.get("phase")?.trim() || null;
  const itemIdRaw = request.nextUrl.searchParams.get("itemId");
  const itemId = itemIdRaw && /^\d+$/.test(itemIdRaw) ? Number(itemIdRaw) : null;

  if (!name) return NextResponse.json({ error: "Missing item name." }, { status: 400 });

  try {
    const calibration = await fetchHistoricalCalibration(name, phase);
    if (itemId !== null && calibration.available) {
      await updateInventoryHistoryCalibration(user.id, itemId, calibration);
    }
    return NextResponse.json({ calibration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Historical appraisal data is unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
