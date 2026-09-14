import { NextResponse } from "next/server";
import { clearSessionOnResponse } from "@/lib/session";
import { publicOrigin } from "@/lib/public-url";

export const runtime = "nodejs";

// GET is intentionally side-effect free. Next.js may prefetch links, so a GET
// request must never destroy a user's session.
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/", publicOrigin(request)));
}

// Only an explicit form POST may sign a user out.
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", publicOrigin(request)), 303);
  clearSessionOnResponse(response);
  return response;
}
