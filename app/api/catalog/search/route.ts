import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ items: [] });
  const items = await searchCatalog(q, 12);
  return NextResponse.json({ items });
}
