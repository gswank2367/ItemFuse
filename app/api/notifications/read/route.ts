import { NextResponse } from "next/server";
import { getUserBySteamId, markNotificationsRead } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  const user = await getUserBySteamId(session.steamId);
  if (!user) return NextResponse.json({ error: "ItemFuse profile not found." }, { status: 404 });
  try {
    const body = await request.json() as { notificationId?: number; all?: boolean };
    await markNotificationsRead(user.id, body.all ? null : Number(body.notificationId) || null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not update notifications." }, { status: 400 });
  }
}
