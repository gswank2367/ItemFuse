import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE = "tradesync_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = { steamId: string; exp: number };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return value;
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function makeSessionValue(steamId: string) {
  const payload: SessionPayload = {
    steamId,
    exp: Date.now() + MAX_AGE_SECONDS * 1000
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  priority: "high" as const
};

export function attachSession(response: NextResponse, steamId: string) {
  response.cookies.set(COOKIE, makeSessionValue(steamId), cookieOptions);
}

export function clearSessionOnResponse(response: NextResponse) {
  response.cookies.set(COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0)
  });
}

// Kept for server actions / compatibility. Route handlers should prefer
// attachSession(response, steamId) so the cookie is guaranteed to leave on
// the exact response being returned to the browser.
export async function createSession(steamId: string) {
  const store = await cookies();
  store.set(COOKIE, makeSessionValue(steamId), cookieOptions);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.steamId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
