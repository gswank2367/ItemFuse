import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getInventory, getUserBySteamId, replaceInventory } from "@/lib/db";
import { getCs2Inventory, SteamInventoryRateLimitError } from "@/lib/steam";

export const runtime = "nodejs";
export const maxDuration = 30;

const FRESH_CACHE_MS = 5 * 60 * 1000;

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in with Steam first." }, { status: 401 });
  }

  const user = await getUserBySteamId(session.steamId);
  if (!user) {
    return NextResponse.json({ error: "ItemFuse profile not found." }, { status: 404 });
  }

  const existingItems = await getInventory(user.id);

  // Avoid repeatedly hitting Steam if we already synced successfully a few minutes ago.
  if (user.last_inventory_sync) {
    const lastSync = new Date(user.last_inventory_sync).getTime();
    if (Number.isFinite(lastSync) && Date.now() - lastSync < FRESH_CACHE_MS) {
      return NextResponse.json({
        ok: true,
        count: existingItems.length,
        cached: true,
        message: "Using your recently synced inventory."
      });
    }
  }

  try {
    const items = await getCs2Inventory(session.steamId);
    await replaceInventory(user.id, items);
    return NextResponse.json({ ok: true, count: items.length, cached: false });
  } catch (error) {
    if (error instanceof SteamInventoryRateLimitError) {
      const retryAfterSeconds = Math.max(error.retryAfterSeconds ?? 60, 60);
      const suffix = existingItems.length
        ? ` Your ${existingItems.length} previously synced items are still available.`
        : "";

      return NextResponse.json(
        {
          error: `Steam is rate limiting inventory requests right now. Wait about ${Math.ceil(retryAfterSeconds / 60)} minute${retryAfterSeconds > 60 ? "s" : ""} before trying again.${suffix}`,
          retryAfterSeconds,
          cachedCount: existingItems.length
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) }
        }
      );
    }

    const message = error instanceof Error ? error.message : "Inventory sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
