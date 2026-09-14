import { NextResponse } from "next/server";
import { getFriendInventoryCache, upsertFriendInventoryCache } from "@/lib/db";
import { getSession } from "@/lib/session";
import { probeCs2Inventory } from "@/lib/steam";

export const runtime = "nodejs";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_BATCH = 3;

type Status = {
  steamId: string;
  hasItems: boolean | null;
  itemCount: number | null;
  isPublic: boolean | null;
  rateLimited: boolean;
  cached: boolean;
  retryAfterSeconds: number | null;
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in to Steam first." }, { status: 401 });

  let body: { steamIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const steamIds = Array.isArray(body.steamIds)
    ? [...new Set(body.steamIds.map(String).filter((id) => /^\d{17}$/.test(id)))].slice(0, MAX_BATCH)
    : [];

  if (!steamIds.length) return NextResponse.json({ statuses: [] as Status[] });

  const cache = await getFriendInventoryCache(steamIds);
  const now = Date.now();
  const statuses = new Map<string, Status>();
  const toProbe: string[] = [];

  for (const steamId of steamIds) {
    const entry = cache.get(steamId);
    const checkedAt = entry ? Date.parse(entry.checkedAt) : 0;
    if (entry && Number.isFinite(checkedAt) && now - checkedAt < CACHE_TTL_MS) {
      statuses.set(steamId, {
        steamId,
        hasItems: entry.itemCount > 0,
        itemCount: entry.itemCount,
        isPublic: entry.isPublic,
        rateLimited: false,
        cached: true,
        retryAfterSeconds: null
      });
    } else {
      toProbe.push(steamId);
    }
  }

  const cacheUpdates: Array<{ steamId: string; itemCount: number; isPublic: boolean }> = [];
  let rateLimited = false;
  let retryAfterSeconds: number | null = null;

  // Probe sequentially. Once Steam returns 429, do not keep hammering the inventory endpoint.
  for (let index = 0; index < toProbe.length; index++) {
    const steamId = toProbe[index];

    if (rateLimited) {
      statuses.set(steamId, {
        steamId,
        hasItems: null,
        itemCount: null,
        isPublic: null,
        rateLimited: true,
        cached: false,
        retryAfterSeconds
      });
      continue;
    }

    try {
      const result = await probeCs2Inventory(steamId);
      if (result.rateLimited) {
        rateLimited = true;
        retryAfterSeconds = result.retryAfterSeconds;
        statuses.set(steamId, {
          steamId,
          hasItems: null,
          itemCount: null,
          isPublic: null,
          rateLimited: true,
          cached: false,
          retryAfterSeconds
        });
        continue;
      }

      const status: Status = {
        steamId,
        hasItems: result.hasItems,
        itemCount: result.itemCount,
        isPublic: result.isPublic,
        rateLimited: false,
        cached: false,
        retryAfterSeconds: null
      };
      statuses.set(steamId, status);
      cacheUpdates.push({ steamId, itemCount: result.itemCount, isPublic: result.isPublic });
    } catch {
      statuses.set(steamId, {
        steamId,
        hasItems: null,
        itemCount: null,
        isPublic: null,
        rateLimited: false,
        cached: false,
        retryAfterSeconds: null
      });
    }
  }

  await upsertFriendInventoryCache(cacheUpdates);

  return NextResponse.json({
    statuses: steamIds.map((steamId) => statuses.get(steamId)!).filter(Boolean),
    rateLimited,
    retryAfterSeconds
  });
}
