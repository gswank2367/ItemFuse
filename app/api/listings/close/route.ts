import { NextResponse } from "next/server";
import { closeListing, getUserBySteamId } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/", request.url));
  const user = await getUserBySteamId(session.steamId);
  if (!user) return NextResponse.redirect(new URL("/", request.url));
  const form = await request.formData();
  const listingId = Number(form.get("listingId"));
  if (Number.isInteger(listingId) && listingId > 0) await closeListing(user.id, listingId);
  return NextResponse.redirect(new URL("/trades", request.url));
}
