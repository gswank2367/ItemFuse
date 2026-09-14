import { NextResponse } from "next/server";
import { addWishlistItem, getUserBySteamId, removeWishlistItem } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

async function currentUser() {
  const session = await getSession();
  if (!session) return null;
  return getUserBySteamId(session.steamId);
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });

  try {
    const body = await request.json() as {
      marketHashName?: string;
      exterior?: string | null;
      phase?: string | null;
      maxFloat?: number | null;
      tolerancePercent?: number;
      notes?: string | null;
    };
    const id = await addWishlistItem({
      userId: user.id,
      marketHashName: String(body.marketHashName ?? "").slice(0, 300),
      exterior: body.exterior ? String(body.exterior).slice(0, 80) : null,
      phase: body.phase ? String(body.phase).slice(0, 80) : null,
      maxFloat: body.maxFloat ?? null,
      tolerancePercent: Number(body.tolerancePercent ?? 10),
      notes: body.notes ? String(body.notes).slice(0, 1000) : null
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add wishlist item." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  const body = await request.json() as { id?: number };
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid wishlist item." }, { status: 400 });
  await removeWishlistItem(user.id, id);
  return NextResponse.json({ ok: true });
}
