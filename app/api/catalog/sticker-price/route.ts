import { NextResponse } from "next/server";
import { getCatalogItemsByNames } from "@/lib/catalog";

function toStickerMarketHashName(input: string) {
  const trimmed = input.trim().replace(/^Sticker:\s*/i, "");
  return /^Sticker\s*\|/i.test(trimmed) ? trimmed : `Sticker | ${trimmed}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawName = url.searchParams.get("name")?.trim() ?? "";
  if (!rawName || rawName.length > 180) {
    return NextResponse.json({ error: "Invalid sticker name." }, { status: 400 });
  }

  const marketHashName = toStickerMarketHashName(rawName);
  const catalog = await getCatalogItemsByNames([marketHashName]);
  const exact = catalog.get(marketHashName)
    ?? [...catalog.values()].find((item) => item.marketHashName.toLowerCase() === marketHashName.toLowerCase())
    ?? null;

  const response = NextResponse.json({
    marketHashName,
    priceCents: exact?.priceCents ?? null,
    imageUrl: exact?.imageUrl ?? null,
    source: exact?.source ?? null
  });
  response.headers.set("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
  return response;
}
