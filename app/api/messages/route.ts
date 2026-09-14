import { NextResponse } from "next/server";
import { getUserBySteamId, sendThreadMessage } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  const user = await getUserBySteamId(session.steamId);
  if (!user) return NextResponse.json({ error: "ItemFuse profile not found." }, { status: 404 });

  try {
    const body = await request.json() as { threadId?: number; body?: string };
    const threadId = Number(body.threadId);
    if (!Number.isInteger(threadId) || threadId <= 0) return NextResponse.json({ error: "Invalid trade thread." }, { status: 400 });
    const id = await sendThreadMessage({ threadId, senderUserId: user.id, body: String(body.body ?? "") });
    return NextResponse.json({
      ok: true,
      message: {
        id,
        threadId,
        senderUserId: user.id,
        recipientUserId: 0,
        body: String(body.body ?? "").trim(),
        createdAt: new Date().toISOString(),
        readAt: null,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send message." }, { status: 400 });
  }
}
