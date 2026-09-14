import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/db";
import { attachSession } from "@/lib/session";
import { getSteamProfile } from "@/lib/steam";
import { publicOrigin } from "@/lib/public-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const origin = publicOrigin(request);
  const verify = new URLSearchParams();
  incoming.searchParams.forEach((value, key) => { if (key.startsWith("openid.")) verify.set(key, value); });
  verify.set("openid.mode", "check_authentication");

  const validation = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: verify.toString(),
    cache: "no-store"
  });
  const validationText = await validation.text();
  if (!validation.ok || !validationText.includes("is_valid:true")) {
    return NextResponse.redirect(new URL("/?auth=failed", origin));
  }

  const claimed = incoming.searchParams.get("openid.claimed_id") ?? "";
  const match = claimed.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(7656119\d{10})$/);
  if (!match) return NextResponse.redirect(new URL("/?auth=invalid", origin));

  const steamId = match[1];
  const profile = await getSteamProfile(steamId);
  await upsertUser(profile);

  const response = NextResponse.redirect(new URL("/", origin));
  attachSession(response, steamId);
  return response;
}
