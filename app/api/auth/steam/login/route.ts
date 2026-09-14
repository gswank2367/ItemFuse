import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/public-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = publicOrigin(request);
  const returnTo = `${origin}/api/auth/steam/callback`;
  const url = new URL("https://steamcommunity.com/openid/login");
  url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.return_to", returnTo);
  url.searchParams.set("openid.realm", origin);
  url.searchParams.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select");
  url.searchParams.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");
  return NextResponse.redirect(url);
}
