import type { DisplayCosmetic, ItemDisplayData } from "@/lib/item-display";
export type SteamProfile = {
  steamId: string;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
};

type SteamAssetProperty = {
  propertyid?: number | string;
  int_value?: number | string;
  float_value?: number | string;
  string_value?: string;
};

type SteamAsset = {
  appid: number;
  contextid: string;
  assetid: string;
  classid: string;
  instanceid: string;
  asset_properties?: SteamAssetProperty[];
};

type SteamDescriptionLine = {
  name?: string;
  type?: string;
  value?: string;
  color?: string;
};

type SteamDescription = {
  classid: string;
  instanceid: string;
  name: string;
  market_hash_name?: string;
  type?: string;
  icon_url?: string;
  tradable?: number;
  marketable?: number;
  tags?: Array<{ category?: string; internal_name?: string; localized_tag_name?: string }>;
  descriptions?: SteamDescriptionLine[];
  actions?: Array<{ link?: string; name?: string }>;
  market_actions?: Array<{ link?: string; name?: string }>;
};

type InventoryResponse = {
  assets?: SteamAsset[];
  descriptions?: SteamDescription[];
  more_items?: number;
  last_assetid?: string;
  total_inventory_count?: number;
  success?: number;
};

type EnrichedCosmetic = {
  name?: string;
  wear?: number | null;
  price?: number | null;
  classid?: string;
  image?: string | null;
};

type SteamDataApiItem = {
  assetid?: string;
  weaponType?: string | null;
  itemType?: string | null;
  type?: string | null;
  marketHashName?: string;
  exterior?: string | null;
  rarity?: string | null;
  float?: number | null;
  paintSeed?: number | null;
  paintIndex?: number | null;
  phase?: string | null;
  fade?: number | null;
  blueGem?: {
    tier?: string | null;
    rank?: number | null;
    totalRanked?: number | null;
    playsideBlue?: number | null;
    backsideBlue?: number | null;
  } | null;
  nameTag?: string | null;
  inspectLink?: string | null;
  stickers?: EnrichedCosmetic[];
  charms?: EnrichedCosmetic[];
  patches?: EnrichedCosmetic[];
  prices?: {
    latest?: number | null;
    median?: number | null;
    buyorder?: number | null;
    real?: number | null;
    realMedian?: number | null;
    realMarket?: string | null;
    value?: number | null;
  } | null;
  image?: { url?: string | null } | string | null;
};

type SteamDataApiInventory = {
  status?: string;
  steamid?: string;
  items?: SteamDataApiItem[];
};

export class SteamInventoryRateLimitError extends Error {
  retryAfterSeconds: number | null;

  constructor(retryAfterSeconds: number | null) {
    super("Steam is temporarily rate limiting inventory requests.");
    this.name = "SteamInventoryRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function xmlValue(xml: string, tag: string) {
  const cdata = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata?.[1]) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plain?.[1]?.trim() ?? null;
}

export async function getSteamProfile(steamId: string): Promise<SteamProfile> {
  const res = await fetch(`https://steamcommunity.com/profiles/${steamId}?xml=1`, {
    cache: "no-store",
    headers: { "User-Agent": "ItemFuse/1.0 (+https://itemfuse.com)" }
  });
  const xml = res.ok ? await res.text() : "";
  return {
    steamId,
    displayName: xmlValue(xml, "steamID") || `Steam ${steamId.slice(-6)}`,
    avatarUrl: xmlValue(xml, "avatarFull"),
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`
  };
}

function tagValue(desc: SteamDescription, category: string) {
  return desc.tags?.find((t) => t.category === category)?.localized_tag_name ?? null;
}

function getAssetProperty(asset: SteamAsset, id: number) {
  return asset.asset_properties?.find((property) => Number(property.propertyid) === id) ?? null;
}

function buildInspectLink(desc: SteamDescription, ownerSteamId: string, asset: SteamAsset) {
  const action = [...(desc.actions ?? []), ...(desc.market_actions ?? [])]
    .find((a) => a.link?.includes("csgo_econ_action_preview"));
  if (!action?.link) return null;

  let link = action.link
    .replaceAll("%owner_steamid%", ownerSteamId)
    .replaceAll("%assetid%", asset.assetid)
    .replaceAll("%contextid%", asset.contextid);

  if (link.includes("%propid:6%")) {
    const encodedInspect = getAssetProperty(asset, 6)?.string_value;
    if (!encodedInspect) return null;
    link = link.replaceAll("%propid:6%", encodedInspect);
  }

  if (/%(?:propid|owner_steamid|assetid|contextid):?/.test(link)) return null;
  return link;
}

function parseRetryAfter(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const when = Date.parse(value);
  if (Number.isNaN(when)) return null;
  return Math.max(0, Math.ceil((when - Date.now()) / 1000));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Cs2InventoryProbe = {
  hasItems: boolean;
  itemCount: number;
  isPublic: boolean;
  rateLimited: boolean;
  retryAfterSeconds: number | null;
};

export async function probeCs2Inventory(steamId: string): Promise<Cs2InventoryProbe> {
  const url = new URL(`https://steamcommunity.com/inventory/${steamId}/730/2`);
  url.searchParams.set("l", "english");
  url.searchParams.set("count", "1");

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "ItemFuse/1.0 (+https://itemfuse.com)",
      "Accept": "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  if (res.status === 401 || res.status === 403) {
    return { hasItems: false, itemCount: 0, isPublic: false, rateLimited: false, retryAfterSeconds: null };
  }
  if (res.status === 429) {
    return {
      hasItems: false,
      itemCount: 0,
      isPublic: true,
      rateLimited: true,
      retryAfterSeconds: parseRetryAfter(res.headers.get("retry-after"))
    };
  }
  if (!res.ok) {
    return { hasItems: false, itemCount: 0, isPublic: true, rateLimited: false, retryAfterSeconds: null };
  }

  const data = await res.json() as InventoryResponse;
  const itemCount = Number(data.total_inventory_count ?? data.assets?.length ?? 0);
  return {
    hasItems: Boolean(data.success) && itemCount > 0,
    itemCount: Number.isFinite(itemCount) ? itemCount : 0,
    isPublic: true,
    rateLimited: false,
    retryAfterSeconds: null
  };
}

async function fetchInventoryPage(url: URL) {
  const fallbackWaitsMs = [1500, 4000];

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "ItemFuse/1.0 (+https://itemfuse.com)",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (res.status === 403 || res.status === 401) {
      throw new Error("Your CS2 inventory is private. Set Game details / Inventory to Public in Steam privacy settings, then try again.");
    }

    if (res.status === 429) {
      const retryAfterSeconds = parseRetryAfter(res.headers.get("retry-after"));
      const canRetry = attempt < 2;
      const serverWaitMs = retryAfterSeconds !== null ? retryAfterSeconds * 1000 : null;
      const waitMs = serverWaitMs !== null && serverWaitMs <= 10000
        ? serverWaitMs
        : fallbackWaitsMs[attempt] ?? 0;

      if (canRetry && waitMs > 0 && waitMs <= 10000) {
        await sleep(waitMs);
        continue;
      }

      throw new SteamInventoryRateLimitError(retryAfterSeconds);
    }

    if (!res.ok) {
      throw new Error(`Steam inventory request failed (${res.status}). Please try again.`);
    }

    return (await res.json()) as InventoryResponse;
  }

  throw new SteamInventoryRateLimitError(null);
}

async function fetchSteamDataApiInventory(steamId: string) {
  const key = process.env.STEAMDATA_API_KEY?.trim();
  if (!key) return null;

  const url = new URL(`https://steamdataapi.com/api/v1/inventory/${steamId}`);
  url.searchParams.set("game", "cs2");
  url.searchParams.set("currency", "USD");

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Accept": "application/json",
      "User-Agent": "ItemFuse/1.0 (+https://itemfuse.com)"
    }
  });

  if (res.status === 401) {
    throw new Error("ItemFuse inventory provider rejected STEAMDATA_API_KEY. Verify the Production secret in Vercel.");
  }
  if (res.status === 403) {
    const body = await res.text();
    if (/inventory_private|private inventory|private profile/i.test(body)) {
      throw new Error("This Steam inventory is private. The owner must set Inventory to Public before ItemFuse can display it.");
    }
    throw new Error("ItemFuse inventory provider requires Steam Data API Pro+ inventory access.");
  }
  if (res.status === 429) {
    throw new Error("ItemFuse's inventory provider quota is temporarily rate limited. Please try again shortly.");
  }
  if (res.status === 503) {
    throw new Error("Steam is temporarily rate limiting this uncached inventory. Please try again shortly.");
  }
  if (!res.ok) {
    throw new Error(`ItemFuse inventory provider request failed (${res.status}).`);
  }

  return (await res.json()) as SteamDataApiInventory;
}

function imageUrlFromEnriched(item: SteamDataApiItem) {
  if (typeof item.image === "string") return item.image;
  if (item.image && typeof item.image === "object") return item.image.url ?? null;
  return null;
}


function providerCosmetics(items: EnrichedCosmetic[] | undefined): DisplayCosmetic[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item?.name)
    .map((item) => ({
      name: String(item.name),
      imageUrl: item.image ? String(item.image) : null,
      wear: item.wear === null || item.wear === undefined || !Number.isFinite(Number(item.wear)) ? null : Number(item.wear),
      priceCents: item.price === null || item.price === undefined || !Number.isFinite(Number(item.price)) ? null : Number(item.price)
    }));
}

/**
 * Friend inventory reader backed by Steam Data API's normal inventory cache.
 * This avoids consuming the shared Vercel egress IP's raw Steam Community
 * inventory allowance every time somebody opens a friend's profile.
 */
export async function getCachedCs2InventoryDisplay(steamId: string): Promise<ItemDisplayData[]> {
  const inventory = await fetchSteamDataApiInventory(steamId);
  if (!inventory?.items?.length) return [];

  return inventory.items.map((item, index): ItemDisplayData => {
    const name = item.marketHashName ?? `CS2 Item ${index + 1}`;
    const weapon = item.weaponType ?? null;
    const itemType = item.itemType ?? item.type ?? weapon ?? "CS2 Item";
    const imageUrl = imageUrlFromEnriched(item);
    const prices = item.prices ?? null;

    return {
      id: String(item.assetid ?? `${steamId}-${index}`),
      name,
      imageUrl,
      subtitle: [weapon, item.exterior].filter(Boolean).join(" • ") || itemType,
      itemType,
      exterior: item.exterior ?? null,
      rarity: item.rarity ?? null,
      weapon,
      // The provider's documented inventory response does not promise current
      // tradable/marketable flags, so do not invent them for a friend's items.
      tradable: null,
      marketable: null,
      enriched: true,
      floatValue: item.float === null || item.float === undefined ? null : Number(item.float),
      paintSeed: item.paintSeed === null || item.paintSeed === undefined ? null : Number(item.paintSeed),
      paintIndex: item.paintIndex === null || item.paintIndex === undefined ? null : Number(item.paintIndex),
      phase: item.phase ?? null,
      fade: item.fade === null || item.fade === undefined ? null : Number(item.fade),
      blueGem: item.blueGem ? {
        tier: item.blueGem.tier ?? null,
        rank: item.blueGem.rank ?? null,
        totalRanked: item.blueGem.totalRanked ?? null,
        playsideBlue: item.blueGem.playsideBlue ?? null,
        backsideBlue: item.blueGem.backsideBlue ?? null
      } : null,
      estimatedValueCents: prices?.value === null || prices?.value === undefined ? null : Number(prices.value),
      steamPriceCents: prices?.latest === null || prices?.latest === undefined ? null : Number(prices.latest),
      realPriceCents: prices?.real === null || prices?.real === undefined ? null : Number(prices.real),
      realMarket: prices?.realMarket ?? null,
      stickers: providerCosmetics(item.stickers),
      charms: providerCosmetics(item.charms),
      patches: providerCosmetics(item.patches),
      inspectLink: item.inspectLink ?? null,
      dbItemId: null,
      historyCalibration: null
    };
  });
}

export async function getCs2Inventory(steamId: string, options: { enrich?: boolean } = {}) {
  const allAssets: SteamAsset[] = [];
  const descMap = new Map<string, SteamDescription>();
  let startAssetId: string | undefined;

  for (let page = 0; page < 10; page++) {
    const url = new URL(`https://steamcommunity.com/inventory/${steamId}/730/2`);
    url.searchParams.set("l", "english");
    url.searchParams.set("count", "2000");
    if (startAssetId) url.searchParams.set("start_assetid", startAssetId);

    const data = await fetchInventoryPage(url);
    if (!data.success) throw new Error("Steam did not return an accessible CS2 inventory.");

    for (const d of data.descriptions ?? []) {
      descMap.set(`${d.classid}_${d.instanceid}`, d);
    }
    allAssets.push(...(data.assets ?? []));

    if (!data.more_items || !data.last_assetid) break;
    startAssetId = data.last_assetid;
  }

  const basicItems = allAssets.map((asset) => {
    const desc = descMap.get(`${asset.classid}_${asset.instanceid}`);
    const raw = desc ?? {
      classid: asset.classid,
      instanceid: asset.instanceid,
      name: "Unknown CS2 Item"
    };

    return {
      asset_id: asset.assetid,
      class_id: asset.classid,
      instance_id: asset.instanceid || "0",
      name: raw.name,
      market_hash_name: raw.market_hash_name ?? null,
      item_type: raw.type ?? null,
      exterior: tagValue(raw, "Exterior"),
      rarity: tagValue(raw, "Rarity"),
      weapon: tagValue(raw, "Weapon"),
      icon_url: raw.icon_url
        ? `https://community.cloudflare.steamstatic.com/economy/image/${raw.icon_url}/360fx360f`
        : null,
      inspect_link: buildInspectLink(raw, steamId, asset),
      tradable: raw.tradable === 1,
      marketable: raw.marketable === 1,
      raw_description: JSON.stringify({
        description: raw,
        asset_properties: asset.asset_properties ?? []
      })
    };
  });

  if (options.enrich === false) return basicItems;

  const enrichedInventory = await fetchSteamDataApiInventory(steamId);
  if (!enrichedInventory?.items?.length) return basicItems;

  const byAssetId = new Map(
    enrichedInventory.items
      .filter((item) => item.assetid)
      .map((item) => [String(item.assetid), item] as const)
  );

  return basicItems.map((item) => {
    const enriched = byAssetId.get(item.asset_id);
    if (!enriched) return item;

    let envelope: Record<string, unknown> = {};
    try {
      envelope = JSON.parse(item.raw_description) as Record<string, unknown>;
    } catch {
      envelope = {};
    }

    envelope.enrichment = {
      provider: "steamdataapi",
      enrichedAt: new Date().toISOString(),
      float: enriched.float ?? null,
      paintSeed: enriched.paintSeed ?? null,
      paintIndex: enriched.paintIndex ?? null,
      phase: enriched.phase ?? null,
      fade: enriched.fade ?? null,
      blueGem: enriched.blueGem ?? null,
      nameTag: enriched.nameTag ?? null,
      inspectLink: enriched.inspectLink ?? null,
      stickers: enriched.stickers ?? [],
      charms: enriched.charms ?? [],
      patches: enriched.patches ?? [],
      prices: enriched.prices ?? null
    };

    return {
      ...item,
      market_hash_name: enriched.marketHashName ?? item.market_hash_name,
      exterior: enriched.exterior ?? item.exterior,
      rarity: enriched.rarity ?? item.rarity,
      icon_url: imageUrlFromEnriched(enriched) ?? item.icon_url,
      inspect_link: enriched.inspectLink ?? item.inspect_link,
      raw_description: JSON.stringify(envelope)
    };
  });
}


export type SteamFriend = {
  steamId: string;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  personaState: number;
  friendSince: number | null;
  lastLogoff: number | null;
};

export class SteamWebApiNotConfiguredError extends Error {
  constructor() {
    super("STEAM_WEB_API_KEY is not configured.");
    this.name = "SteamWebApiNotConfiguredError";
  }
}

export class SteamFriendsPrivateError extends Error {
  constructor() {
    super("Your Steam friends list is private. Set Friends List to Public in Steam privacy settings to use this feature.");
    this.name = "SteamFriendsPrivateError";
  }
}

type FriendListResponse = {
  friendslist?: {
    friends?: Array<{ steamid?: string; relationship?: string; friend_since?: number }>;
  };
};

type PlayerSummary = {
  steamid?: string;
  personaname?: string;
  avatarfull?: string;
  avatarmedium?: string;
  profileurl?: string;
  personastate?: number;
  lastlogoff?: number;
};

type PlayerSummariesResponse = { response?: { players?: PlayerSummary[] } };

function steamWebApiKey() {
  const key = process.env.STEAM_WEB_API_KEY?.trim();
  if (!key) throw new SteamWebApiNotConfiguredError();
  return key;
}

async function steamApiJson<T>(url: URL): Promise<T> {
  // Regular Steam Web API user keys belong on the public API host and are
  // supplied as the documented `key` query parameter. The partner-only host
  // requires a publisher key and rejects normal user keys with HTTP 403.
  url.searchParams.set("key", steamWebApiKey());
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Accept": "application/json",
      "User-Agent": "ItemFuse/1.0"
    }
  });
  if (res.status === 401) throw new SteamFriendsPrivateError();
  if (res.status === 403) throw new Error("Steam Web API rejected the configured key. Verify STEAM_WEB_API_KEY in Vercel and redeploy.");
  if (res.status === 429) throw new Error("Steam is rate limiting friends requests. Please try again shortly.");
  if (!res.ok) throw new Error(`Steam friends request failed (${res.status}).`);
  return await res.json() as T;
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
}

export async function getSteamFriends(steamId: string): Promise<SteamFriend[]> {
  const listUrl = new URL("https://api.steampowered.com/ISteamUser/GetFriendList/v1/");
  listUrl.searchParams.set("steamid", steamId);
  listUrl.searchParams.set("relationship", "friend");
  const list = await steamApiJson<FriendListResponse>(listUrl);
  const rawFriends = (list.friendslist?.friends ?? []).filter((friend) => friend.steamid && friend.relationship === "friend");
  const friendIds = rawFriends.map((friend) => String(friend.steamid));
  if (!friendIds.length) return [];

  const summaries = new Map<string, PlayerSummary>();
  for (const batch of chunks(friendIds, 100)) {
    const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/");
    url.searchParams.set("steamids", batch.join(","));
    const data = await steamApiJson<PlayerSummariesResponse>(url);
    for (const player of data.response?.players ?? []) {
      if (player.steamid) summaries.set(String(player.steamid), player);
    }
  }

  return rawFriends.map((friend) => {
    const id = String(friend.steamid);
    const player = summaries.get(id);
    return {
      steamId: id,
      displayName: player?.personaname || `Steam ${id.slice(-6)}`,
      avatarUrl: player?.avatarfull || player?.avatarmedium || null,
      profileUrl: player?.profileurl || `https://steamcommunity.com/profiles/${id}`,
      personaState: Number(player?.personastate ?? 0),
      friendSince: friend.friend_since ?? null,
      lastLogoff: player?.lastlogoff ?? null
    };
  }).sort((a, b) => {
    const online = Number(b.personaState > 0) - Number(a.personaState > 0);
    if (online !== 0) return online;
    return a.displayName.localeCompare(b.displayName);
  });
}
