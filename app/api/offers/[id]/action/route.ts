import { NextResponse } from "next/server";
import { actOnOffer, getUserBySteamId } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  const user = await getUserBySteamId(session.steamId);
  if (!user) return NextResponse.json({ error: "ItemFuse profile not found." }, { status: 404 });
  const { id } = await params;
  const offerId = Number(id);

  try {
    const body = await request.json() as { action?: string };
    const action = body.action;
    if (action !== "accept" && action !== "reject" && action !== "cancel") {
      return NextResponse.json({ error: "Invalid offer action." }, { status: 400 });
    }
    const status = await actOnOffer({ offerId, userId: user.id, action });
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update offer." }, { status: 400 });
  }
}
