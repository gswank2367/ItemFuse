import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const explicit = process.env.APP_URL?.trim();
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const currentHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    || request.headers.get("host")
    || request.nextUrl.host;

  let canonicalOrigin: string | null = null;
  if (explicit) {
    canonicalOrigin = new URL(explicit).origin;
  } else if (productionHost && currentHost.endsWith(".vercel.app") && currentHost !== productionHost) {
    canonicalOrigin = `https://${productionHost}`;
  }

  if (!canonicalOrigin) return NextResponse.next();

  const canonical = new URL(canonicalOrigin);
  if (currentHost === canonical.host) return NextResponse.next();

  const target = request.nextUrl.clone();
  target.protocol = canonical.protocol;
  target.host = canonical.host;
  target.port = canonical.port;
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"]
};
