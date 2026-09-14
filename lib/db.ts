import { neon } from "@neondatabase/serverless";
import { appraisalMidpoint, type HistoricalCalibration } from "@/lib/appraisal";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export type DbUser = {
  id: number;
  steam_id: string;
  display_name: string;
  avatar_url: string | null;
  profile_url: string | null;
  trade_url: string | null;
  last_inventory_sync: string | null;
};

function hydrateDbUser(row: Record<string, unknown>): DbUser {
  return {
    id: Number(row.id),
    steam_id: String(row.steam_id),
    display_name: String(row.display_name ?? "Steam User"),
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    profile_url: row.profile_url ? String(row.profile_url) : null,
    trade_url: row.trade_url ? String(row.trade_url) : null,
    last_inventory_sync: row.last_inventory_sync ? String(row.last_inventory_sync) : null,
  };
}

export type Cosmetic = {
  name: string;
  imageUrl: string | null;
  wear: number | null;
  priceCents: number | null;
};

export type BlueGem = {
  tier: string | null;
  rank: number | null;
  totalRanked: number | null;
  playsideBlue: number | null;
  backsideBlue: number | null;
};

export type DbItem = {
  id: number;
  asset_id: string;
  name: string;
  market_hash_name: string | null;
  item_type: string | null;
  exterior: string | null;
  rarity: string | null;
  weapon: string | null;
  icon_url: string | null;
  inspect_link: string | null;
  tradable: boolean;
  marketable: boolean;
  float_value: number | null;
  paint_seed: number | null;
  paint_index: number | null;
  phase: string | null;
  fade: number | null;
  blue_gem: BlueGem | null;
  estimated_value_cents: number | null;
  steam_price_cents: number | null;
  real_price_cents: number | null;
  real_market: string | null;
  stickers: Cosmetic[];
  charms: Cosmetic[];
  patches: Cosmetic[];
  enriched: boolean;
  history_calibration: HistoricalCalibration | null;
};

export type WantedItem = {
  marketHashName: string;
  exterior: string | null;
  tolerancePercent: number;
};

export type WishlistItem = {
  id: number;
  userId: number;
  marketHashName: string;
  exterior: string | null;
  phase: string | null;
  maxFloat: number | null;
  tolerancePercent: number;
  notes: string | null;
  createdAt: string;
};

export type TradeListing = {
  id: number;
  userId: number;
  steamId: string;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  tradeUrl: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  offered: DbItem;
  wanted: WantedItem;
};

export type TradeMatch = {
  score: number;
  valueDeltaPercent: number | null;
  yourListing: TradeListing;
  theirListing: TradeListing;
};

type RawProperty = {
  propertyid?: number | string;
  int_value?: number | string;
  float_value?: number | string;
  string_value?: string;
};

type RawDescriptionLine = { name?: string; value?: string };
type RawDescription = { descriptions?: RawDescriptionLine[] };

type RawCosmetic = {
  name?: string;
  image?: string | null;
  wear?: number | null;
  price?: number | null;
};

type RawEnrichment = {
  provider?: string;
  float?: number | null;
  paintSeed?: number | null;
  paintIndex?: number | null;
  phase?: string | null;
  fade?: number | null;
  blueGem?: BlueGem | null;
  inspectLink?: string | null;
  stickers?: RawCosmetic[];
  charms?: RawCosmetic[];
  patches?: RawCosmetic[];
  prices?: {
    latest?: number | null;
    real?: number | null;
    realMarket?: string | null;
    value?: number | null;
  } | null;
  historyCalibration?: HistoricalCalibration | null;
};

type RawEnvelope = {
  description?: RawDescription;
  asset_properties?: RawProperty[];
  enrichment?: RawEnrichment;
};

function unwrapRaw(value: unknown): { description: RawDescription; properties: RawProperty[]; enrichment: RawEnrichment | null } {
  if (!value || typeof value !== "object") return { description: {}, properties: [], enrichment: null };
  const candidate = value as RawEnvelope & RawDescription;
  if (candidate.description && typeof candidate.description === "object") {
    return {
      description: candidate.description,
      properties: Array.isArray(candidate.asset_properties) ? candidate.asset_properties : [],
      enrichment: candidate.enrichment && typeof candidate.enrichment === "object" ? candidate.enrichment : null
    };
  }
  return { description: candidate, properties: [], enrichment: null };
}

function getProperty(properties: RawProperty[], id: number) {
  return properties.find((property) => Number(property.propertyid) === id) ?? null;
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function extractCosmeticsFromDescription(description: RawDescription, lineName: "sticker_info" | "keychain_info") {
  const html = description.descriptions?.find((line) => line.name === lineName)?.value;
  if (!html) return [] as Cosmetic[];

  const cosmetics: Cosmetic[] = [];
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imgTags) {
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? null;
    const title = tag.match(/\btitle=["']([^"']+)["']/i)?.[1] ?? "";
    if (!title) continue;
    const name = title
      .replace(/^Sticker:\s*/i, "")
      .replace(/^Charm:\s*/i, "")
      .replace(/^Sticker Slab:\s*/i, "")
      .trim();
    if (name) cosmetics.push({ name, imageUrl: src, wear: null, priceCents: null });
  }
  return cosmetics;
}

function providerCosmetics(items: RawCosmetic[] | undefined, fallback: Cosmetic[] = []) {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return items
    .filter((item) => item?.name)
    .map((item) => ({
      name: String(item.name),
      imageUrl: item.image ? String(item.image) : null,
      wear: finiteNumber(item.wear),
      priceCents: finiteNumber(item.price)
    }));
}

function hydrateItem(row: Record<string, unknown>): DbItem {
  const { description, properties, enrichment } = unwrapRaw(row.raw_description);
  const floatValue = finiteNumber(enrichment?.float) ?? finiteNumber(getProperty(properties, 2)?.float_value);
  const paintSeed = finiteNumber(enrichment?.paintSeed) ?? finiteNumber(getProperty(properties, 1)?.int_value);

  let inspectLink = typeof row.inspect_link === "string" ? row.inspect_link : null;
  if (!inspectLink && enrichment?.inspectLink) inspectLink = enrichment.inspectLink;
  if (inspectLink?.includes("%propid:6%")) {
    const payload = getProperty(properties, 6)?.string_value;
    inspectLink = payload ? inspectLink.replaceAll("%propid:6%", payload) : null;
  }
  if (inspectLink && inspectLink.includes("%propid:")) inspectLink = null;

  const fallbackStickers = extractCosmeticsFromDescription(description, "sticker_info");
  const fallbackCharms = extractCosmeticsFromDescription(description, "keychain_info");

  return {
    id: Number(row.id),
    asset_id: String(row.asset_id),
    name: String(row.name),
    market_hash_name: row.market_hash_name ? String(row.market_hash_name) : null,
    item_type: row.item_type ? String(row.item_type) : null,
    exterior: row.exterior ? String(row.exterior) : null,
    rarity: row.rarity ? String(row.rarity) : null,
    weapon: row.weapon ? String(row.weapon) : null,
    icon_url: row.icon_url ? String(row.icon_url) : null,
    inspect_link: inspectLink,
    tradable: Boolean(row.tradable),
    marketable: Boolean(row.marketable),
    float_value: floatValue,
    paint_seed: paintSeed,
    paint_index: finiteNumber(enrichment?.paintIndex),
    phase: enrichment?.phase ? String(enrichment.phase) : null,
    fade: finiteNumber(enrichment?.fade),
    blue_gem: enrichment?.blueGem ?? null,
    estimated_value_cents: finiteNumber(enrichment?.prices?.value),
    steam_price_cents: finiteNumber(enrichment?.prices?.latest),
    real_price_cents: finiteNumber(enrichment?.prices?.real),
    real_market: enrichment?.prices?.realMarket ? String(enrichment.prices.realMarket) : null,
    stickers: providerCosmetics(enrichment?.stickers, fallbackStickers),
    charms: providerCosmetics(enrichment?.charms, fallbackCharms),
    patches: providerCosmetics(enrichment?.patches),
    enriched: enrichment?.provider === "steamdataapi",
    history_calibration: enrichment?.historyCalibration ?? null
  };
}

function offeredValue(item: DbItem) {
  return appraisalMidpoint({
    name: item.market_hash_name ?? item.name,
    exterior: item.exterior,
    floatValue: item.float_value,
    phase: item.phase,
    fade: item.fade,
    blueGem: item.blue_gem,
    estimatedValueCents: item.estimated_value_cents,
    steamPriceCents: item.steam_price_cents,
    realPriceCents: item.real_price_cents,
    historyCalibration: item.history_calibration,
  });
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function wantedMatches(wanted: WantedItem, offered: DbItem) {
  const wantedName = normalize(wanted.marketHashName);
  const offeredName = normalize(offered.market_hash_name ?? offered.name);
  if (wantedName !== "*" && wantedName !== offeredName) return false;
  if (wanted.exterior && normalize(wanted.exterior) !== normalize(offered.exterior)) return false;
  return true;
}

function hydrateListing(row: Record<string, unknown>): TradeListing {
  const itemRow: Record<string, unknown> = {
    id: row.item_id,
    asset_id: row.asset_id,
    name: row.item_name,
    market_hash_name: row.market_hash_name,
    item_type: row.item_type,
    exterior: row.exterior,
    rarity: row.rarity,
    weapon: row.weapon,
    icon_url: row.icon_url,
    inspect_link: row.inspect_link,
    tradable: row.tradable,
    marketable: row.marketable,
    raw_description: row.raw_description
  };
  return {
    id: Number(row.listing_id),
    userId: Number(row.user_id),
    steamId: String(row.steam_id),
    displayName: String(row.display_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    profileUrl: row.profile_url ? String(row.profile_url) : null,
    tradeUrl: row.trade_url ? String(row.trade_url) : null,
    notes: row.notes ? String(row.notes) : null,
    status: String(row.status),
    createdAt: String(row.created_at),
    offered: hydrateItem(itemRow),
    wanted: {
      marketHashName: String(row.wanted_market_hash_name ?? "*"),
      exterior: row.wanted_exterior ? String(row.wanted_exterior) : null,
      tolerancePercent: Number(row.max_value_delta_percent ?? 5)
    }
  };
}

const listingSelect = `
  SELECT
    l.id AS listing_id, l.user_id, l.notes, l.status, l.created_at,
    u.steam_id, u.display_name, u.avatar_url, u.profile_url, u.trade_url,
    ii.id AS item_id, ii.asset_id, ii.name AS item_name, ii.market_hash_name,
    ii.item_type, ii.exterior, ii.rarity, ii.weapon, ii.icon_url, ii.inspect_link,
    ii.tradable, ii.marketable, ii.raw_description,
    wi.market_hash_name AS wanted_market_hash_name,
    wi.min_exterior AS wanted_exterior,
    wi.max_value_delta_percent
  FROM listings l
  JOIN users u ON u.id = l.user_id
  JOIN listing_items li ON li.listing_id = l.id
  JOIN inventory_items ii ON ii.id = li.inventory_item_id
  LEFT JOIN LATERAL (
    SELECT market_hash_name, min_exterior, max_value_delta_percent
    FROM wanted_items
    WHERE listing_id = l.id
    ORDER BY id ASC
    LIMIT 1
  ) wi ON true
`;

export async function upsertUser(profile: {
  steamId: string;
  displayName: string;
  avatarUrl?: string | null;
  profileUrl?: string | null;
}) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO users (steam_id, display_name, avatar_url, profile_url, updated_at)
    VALUES (${profile.steamId}, ${profile.displayName}, ${profile.avatarUrl ?? null}, ${profile.profileUrl ?? null}, NOW())
    ON CONFLICT (steam_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      profile_url = EXCLUDED.profile_url,
      updated_at = NOW()
    RETURNING id, steam_id, display_name, avatar_url, profile_url, trade_url, last_inventory_sync
  `;
  return hydrateDbUser(rows[0] as Record<string, unknown>);
}

export async function getUserBySteamId(steamId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, steam_id, display_name, avatar_url, profile_url, trade_url, last_inventory_sync
    FROM users WHERE steam_id = ${steamId} LIMIT 1
  `;
  return rows[0] ? hydrateDbUser(rows[0] as Record<string, unknown>) : null;
}

export async function getKnownUsersBySteamIds(steamIds: string[]) {
  if (!steamIds.length) return new Map<string, DbUser>();
  const sql = getSql();
  const rows = await sql.query(
    `SELECT id, steam_id, display_name, avatar_url, profile_url, trade_url, last_inventory_sync
     FROM users WHERE steam_id = ANY($1::text[])`,
    [steamIds]
  );
  const users = (rows as Array<Record<string, unknown>>).map(hydrateDbUser);
  return new Map(users.map((user) => [user.steam_id, user]));
}

export type FriendInventoryCache = {
  steamId: string;
  itemCount: number;
  isPublic: boolean;
  checkedAt: string;
};

export async function getFriendInventoryCache(steamIds: string[]) {
  if (!steamIds.length) return new Map<string, FriendInventoryCache>();
  const sql = getSql();
  const rows = await sql.query(
    `SELECT steam_id, item_count, is_public, checked_at
     FROM friend_inventory_cache
     WHERE steam_id = ANY($1::text[])`,
    [steamIds]
  );
  return new Map((rows as Array<{ steam_id: string; item_count: number; is_public: boolean; checked_at: string }>).map((row) => [
    row.steam_id,
    { steamId: row.steam_id, itemCount: Number(row.item_count), isPublic: Boolean(row.is_public), checkedAt: String(row.checked_at) }
  ]));
}

export async function upsertFriendInventoryCache(entries: Array<{ steamId: string; itemCount: number; isPublic: boolean }>) {
  if (!entries.length) return;
  const sql = getSql();
  for (const entry of entries) {
    await sql`
      INSERT INTO friend_inventory_cache (steam_id, item_count, is_public, checked_at)
      VALUES (${entry.steamId}, ${entry.itemCount}, ${entry.isPublic}, NOW())
      ON CONFLICT (steam_id) DO UPDATE SET
        item_count = EXCLUDED.item_count,
        is_public = EXCLUDED.is_public,
        checked_at = NOW()
    `;
  }
}

export async function updateTradeUrl(userId: number, tradeUrl: string | null) {
  const sql = getSql();
  await sql`UPDATE users SET trade_url = ${tradeUrl}, updated_at = NOW() WHERE id = ${userId}`;
}

export async function getInventory(userId: number) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, asset_id, name, market_hash_name, item_type, exterior, rarity, weapon,
           icon_url, inspect_link, tradable, marketable, raw_description
    FROM inventory_items
    WHERE user_id = ${userId}
    ORDER BY tradable DESC, marketable DESC, market_hash_name ASC NULLS LAST, name ASC
  `;
  return (rows as Array<Record<string, unknown>>).map(hydrateItem);
}

export async function getInventoryItem(userId: number, itemId: number) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, asset_id, name, market_hash_name, item_type, exterior, rarity, weapon,
           icon_url, inspect_link, tradable, marketable, raw_description
    FROM inventory_items
    WHERE user_id = ${userId} AND id = ${itemId}
    LIMIT 1
  `;
  return rows[0] ? hydrateItem(rows[0] as Record<string, unknown>) : null;
}

export async function getKnownMarketNames(limit = 250) {
  const sql = getSql();
  const rows = await sql.query(
    `SELECT DISTINCT market_hash_name
     FROM inventory_items
     WHERE market_hash_name IS NOT NULL
     ORDER BY market_hash_name ASC
     LIMIT $1`,
    [limit]
  );
  return (rows as Array<{ market_hash_name: string }>).map((row) => row.market_hash_name);
}


export async function searchCatalogFromInventory(query: string, limit = 12) {
  const sql = getSql();
  const pattern = `%${query.trim()}%`;
  const rows = await sql.query(
    `SELECT DISTINCT ON (market_hash_name) market_hash_name, icon_url, raw_description
     FROM inventory_items
     WHERE market_hash_name IS NOT NULL AND market_hash_name ILIKE $1
     ORDER BY market_hash_name, synced_at DESC
     LIMIT $2`,
    [pattern, limit]
  );
  return (rows as Array<Record<string, unknown>>).map((row) => {
    const item = hydrateItem({
      id: 0, asset_id: 'catalog', name: row.market_hash_name, market_hash_name: row.market_hash_name,
      item_type: null, exterior: null, rarity: null, weapon: null, icon_url: row.icon_url, inspect_link: null,
      tradable: false, marketable: true, raw_description: row.raw_description
    });
    return {
      marketHashName: String(row.market_hash_name),
      imageUrl: row.icon_url ? String(row.icon_url) : null,
      priceCents: item.estimated_value_cents ?? item.real_price_cents ?? item.steam_price_cents,
      source: 'inventory' as const
    };
  });
}

export async function getCatalogByNamesFromInventory(names: string[]) {
  const result = new Map<string, { marketHashName: string; imageUrl: string | null; priceCents: number | null; source: 'inventory' }>();
  if (!names.length) return result;
  const sql = getSql();
  const rows = await sql.query(
    `SELECT DISTINCT ON (market_hash_name) market_hash_name, icon_url, raw_description
     FROM inventory_items
     WHERE market_hash_name = ANY($1::text[])
     ORDER BY market_hash_name, synced_at DESC`,
    [names]
  );
  for (const row of rows as Array<Record<string, unknown>>) {
    const item = hydrateItem({
      id: 0, asset_id: 'catalog', name: row.market_hash_name, market_hash_name: row.market_hash_name,
      item_type: null, exterior: null, rarity: null, weapon: null, icon_url: row.icon_url, inspect_link: null,
      tradable: false, marketable: true, raw_description: row.raw_description
    });
    result.set(String(row.market_hash_name), {
      marketHashName: String(row.market_hash_name),
      imageUrl: row.icon_url ? String(row.icon_url) : null,
      priceCents: item.estimated_value_cents ?? item.real_price_cents ?? item.steam_price_cents,
      source: 'inventory'
    });
  }
  return result;
}

export async function replaceInventory(userId: number, items: Array<Record<string, unknown>>) {
  const sql = getSql();
  const syncedAt = new Date().toISOString();

  if (items.length) {
    await sql.query(
      `INSERT INTO inventory_items (
        user_id, asset_id, class_id, instance_id, name, market_hash_name, item_type,
        exterior, rarity, weapon, icon_url, inspect_link, tradable, marketable,
        raw_description, synced_at
      )
      SELECT $1, x.asset_id, x.class_id, x.instance_id, x.name, x.market_hash_name,
        x.item_type, x.exterior, x.rarity, x.weapon, x.icon_url, x.inspect_link,
        x.tradable, x.marketable, x.raw_description::jsonb, $3::timestamptz
      FROM jsonb_to_recordset($2::jsonb) AS x(
        asset_id text, class_id text, instance_id text, name text,
        market_hash_name text, item_type text, exterior text, rarity text,
        weapon text, icon_url text, inspect_link text, tradable boolean,
        marketable boolean, raw_description text
      )
      ON CONFLICT (user_id, asset_id) DO UPDATE SET
        class_id = EXCLUDED.class_id,
        instance_id = EXCLUDED.instance_id,
        name = EXCLUDED.name,
        market_hash_name = EXCLUDED.market_hash_name,
        item_type = EXCLUDED.item_type,
        exterior = EXCLUDED.exterior,
        rarity = EXCLUDED.rarity,
        weapon = EXCLUDED.weapon,
        icon_url = EXCLUDED.icon_url,
        inspect_link = EXCLUDED.inspect_link,
        tradable = EXCLUDED.tradable,
        marketable = EXCLUDED.marketable,
        raw_description = EXCLUDED.raw_description,
        synced_at = EXCLUDED.synced_at`,
      [userId, JSON.stringify(items), syncedAt]
    );

    await sql.query(
      `DELETE FROM inventory_items ii
       WHERE ii.user_id = $1
         AND ii.synced_at < $2::timestamptz
         AND NOT EXISTS (
           SELECT 1 FROM listing_items li WHERE li.inventory_item_id = ii.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM offer_items oi WHERE oi.inventory_item_id = ii.id
         )`,
      [userId, syncedAt]
    );
  }

  await sql.query(
    `UPDATE users SET last_inventory_sync = $2::timestamptz, updated_at = NOW() WHERE id = $1`,
    [userId, syncedAt]
  );
}


export async function updateInventoryHistoryCalibration(userId: number, itemId: number, calibration: HistoricalCalibration) {
  const sql = getSql();
  await sql.query(
    `UPDATE inventory_items
     SET raw_description = jsonb_set(
       jsonb_set(
         COALESCE(raw_description, '{}'::jsonb),
         '{enrichment}',
         COALESCE(raw_description->'enrichment', '{}'::jsonb),
         true
       ),
       '{enrichment,historyCalibration}',
       $3::jsonb,
       true
     )
     WHERE id = $2 AND user_id = $1`,
    [userId, itemId, JSON.stringify(calibration)]
  );
}

export async function getWishlistForUser(userId: number) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, user_id, market_hash_name, preferred_exterior, preferred_phase,
           max_float, max_value_delta_percent, notes, created_at
    FROM wishlist_items
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return (rows as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    marketHashName: String(row.market_hash_name),
    exterior: row.preferred_exterior ? String(row.preferred_exterior) : null,
    phase: row.preferred_phase ? String(row.preferred_phase) : null,
    maxFloat: finiteNumber(row.max_float),
    tolerancePercent: Number(row.max_value_delta_percent ?? 10),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at)
  } satisfies WishlistItem));
}

export async function addWishlistItem(input: {
  userId: number;
  marketHashName: string;
  exterior?: string | null;
  phase?: string | null;
  maxFloat?: number | null;
  tolerancePercent?: number;
  notes?: string | null;
}) {
  const sql = getSql();
  const name = input.marketHashName.trim();
  if (!name) throw new Error("Enter an item you want.");
  const tolerance = Math.min(50, Math.max(0, Number(input.tolerancePercent) || 10));
  const maxFloat = input.maxFloat === null || input.maxFloat === undefined || Number.isNaN(Number(input.maxFloat))
    ? null
    : Math.min(1, Math.max(0, Number(input.maxFloat)));

  const rows = await sql`
    INSERT INTO wishlist_items (
      user_id, market_hash_name, preferred_exterior, preferred_phase,
      max_float, max_value_delta_percent, notes
    )
    VALUES (
      ${input.userId}, ${name}, ${input.exterior || null}, ${input.phase || null},
      ${maxFloat}, ${tolerance}, ${input.notes?.trim() || null}
    )
    RETURNING id
  `;
  return Number(rows[0].id);
}

export async function removeWishlistItem(userId: number, wishlistItemId: number) {
  const sql = getSql();
  await sql`
    DELETE FROM wishlist_items
    WHERE id = ${wishlistItemId} AND user_id = ${userId}
  `;
}

async function getWishlistsForUsers(userIds: number[]) {
  if (!userIds.length) return new Map<number, WishlistItem[]>();
  const sql = getSql();
  const rows = await sql.query(
    `SELECT id, user_id, market_hash_name, preferred_exterior, preferred_phase,
            max_float, max_value_delta_percent, notes, created_at
     FROM wishlist_items
     WHERE user_id = ANY($1::bigint[])`,
    [userIds]
  );

  const map = new Map<number, WishlistItem[]>();
  for (const row of rows as Array<Record<string, unknown>>) {
    const userId = Number(row.user_id);
    const item: WishlistItem = {
      id: Number(row.id),
      userId,
      marketHashName: String(row.market_hash_name),
      exterior: row.preferred_exterior ? String(row.preferred_exterior) : null,
      phase: row.preferred_phase ? String(row.preferred_phase) : null,
      maxFloat: finiteNumber(row.max_float),
      tolerancePercent: Number(row.max_value_delta_percent ?? 10),
      notes: row.notes ? String(row.notes) : null,
      createdAt: String(row.created_at)
    };
    map.set(userId, [...(map.get(userId) ?? []), item]);
  }
  return map;
}

function wishlistMatches(wanted: WishlistItem, offered: DbItem) {
  if (normalize(wanted.marketHashName) !== normalize(offered.market_hash_name ?? offered.name)) return false;
  if (wanted.exterior && normalize(wanted.exterior) !== normalize(offered.exterior)) return false;
  if (wanted.phase && normalize(wanted.phase) !== normalize(offered.phase)) return false;
  if (wanted.maxFloat !== null && offered.float_value !== null && offered.float_value > wanted.maxFloat) return false;
  return true;
}

function matchingPreference(listingWanted: WantedItem, wishlist: WishlistItem[], offered: DbItem) {
  const wish = wishlist.find((item) => wishlistMatches(item, offered));
  if (wish) return { tolerancePercent: wish.tolerancePercent, source: "wishlist" as const };
  if (wantedMatches(listingWanted, offered)) {
    return { tolerancePercent: listingWanted.tolerancePercent, source: "listing" as const };
  }
  return null;
}

export async function createListing(input: {
  userId: number;
  inventoryItemId: number;
  wantedMarketHashName: string;
  wantedExterior?: string | null;
  tolerancePercent: number;
  notes?: string | null;
}) {
  const sql = getSql();
  const wanted = input.wantedMarketHashName.trim() || "*";
  const tolerance = Math.min(50, Math.max(0, Number(input.tolerancePercent) || 5));
  const rows = await sql.query(
    `WITH owned AS (
       SELECT id FROM inventory_items
       WHERE id = $2 AND user_id = $1 AND tradable = true
     ), new_listing AS (
       INSERT INTO listings (user_id, title, notes, status, created_at, updated_at)
       SELECT $1, 'Open to offers', $6, 'active', NOW(), NOW()
       FROM owned
       RETURNING id
     ), linked AS (
       INSERT INTO listing_items (listing_id, inventory_item_id)
       SELECT nl.id, o.id FROM new_listing nl CROSS JOIN owned o
       RETURNING listing_id
     ), wanted AS (
       INSERT INTO wanted_items (listing_id, market_hash_name, min_exterior, max_value_delta_percent)
       SELECT nl.id, $3, NULLIF($4, ''), $5 FROM new_listing nl
       RETURNING listing_id
     )
     SELECT id FROM new_listing`,
    [input.userId, input.inventoryItemId, wanted, input.wantedExterior ?? null, tolerance, input.notes ?? null]
  );
  if (!rows.length) throw new Error("That item is not available for trading on your account.");
  return Number((rows[0] as { id: number }).id);
}

export async function closeListing(userId: number, listingId: number) {
  const sql = getSql();
  await sql`
    UPDATE listings
    SET status = 'closed', updated_at = NOW()
    WHERE id = ${listingId} AND user_id = ${userId}
  `;
}

export async function getListingsForUser(userId: number) {
  const sql = getSql();
  const rows = await sql.query(`${listingSelect} WHERE l.user_id = $1 AND l.status = 'active' ORDER BY l.created_at DESC`, [userId]);
  return (rows as Array<Record<string, unknown>>).map(hydrateListing);
}

export async function getAllActiveListings() {
  const sql = getSql();
  const rows = await sql.query(`${listingSelect} WHERE l.status = 'active' ORDER BY l.created_at DESC`);
  return (rows as Array<Record<string, unknown>>).map(hydrateListing);
}

export async function getMatchesForUser(userId: number) {
  const listings = await getAllActiveListings();
  const yours = listings.filter((listing) => listing.userId === userId);
  const others = listings.filter((listing) => listing.userId !== userId);
  const userIds = [...new Set(listings.map((listing) => listing.userId))];
  const wishlists = await getWishlistsForUsers(userIds);
  const matches: TradeMatch[] = [];

  for (const yourListing of yours) {
    for (const theirListing of others) {
      const yourPreference = matchingPreference(
        yourListing.wanted,
        wishlists.get(yourListing.userId) ?? [],
        theirListing.offered
      );
      if (!yourPreference) continue;

      const theirPreference = matchingPreference(
        theirListing.wanted,
        wishlists.get(theirListing.userId) ?? [],
        yourListing.offered
      );
      if (!theirPreference) continue;

      const yourValue = offeredValue(yourListing.offered);
      const theirValue = offeredValue(theirListing.offered);
      let valueDeltaPercent: number | null = null;
      let valueScore = 10;
      if (yourValue && theirValue) {
        valueDeltaPercent = Math.abs(yourValue - theirValue) / Math.max(yourValue, theirValue) * 100;
        const allowed = Math.max(yourPreference.tolerancePercent, theirPreference.tolerancePercent);
        if (valueDeltaPercent > allowed) continue;
        valueScore = Math.max(0, 20 - valueDeltaPercent * 2);
      }

      const listingExactA = wantedMatches(yourListing.wanted, theirListing.offered);
      const listingExactB = wantedMatches(theirListing.wanted, yourListing.offered);
      const exactScore = (listingExactA ? 20 : 14) + (listingExactB ? 20 : 14);
      const wishlistBonus = (yourPreference.source === "wishlist" ? 4 : 0) + (theirPreference.source === "wishlist" ? 4 : 0);
      const enrichedScore = (yourListing.offered.enriched && theirListing.offered.enriched) ? 10 : 5;
      const score = Math.min(100, Math.round(36 + exactScore + valueScore + wishlistBonus + enrichedScore));

      matches.push({ score, valueDeltaPercent, yourListing, theirListing });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}


export type OfferStatus = "pending" | "accepted" | "rejected" | "countered" | "cancelled";

export type TradeThread = {
  id: number;
  listingId: number;
  userAId: number;
  userBId: number;
  createdAt: string;
  updatedAt: string;
};

export type TradeOffer = {
  id: number;
  threadId: number;
  listingId: number;
  initiatorUserId: number;
  parentOfferId: number | null;
  status: OfferStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  userA: DbUser;
  userB: DbUser;
  itemsByUser: Record<number, DbItem[]>;
};

export type ThreadMessage = {
  id: number;
  threadId: number;
  senderUserId: number;
  recipientUserId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type UserNotification = {
  id: number;
  userId: number;
  actorUserId: number | null;
  threadId: number | null;
  offerId: number | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function getUserById(userId: number) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, steam_id, display_name, avatar_url, profile_url, trade_url, last_inventory_sync
    FROM users WHERE id = ${userId} LIMIT 1
  `;
  return rows[0] ? hydrateDbUser(rows[0] as Record<string, unknown>) : null;
}

export async function getListingById(listingId: number) {
  const sql = getSql();
  const rows = await sql.query(`${listingSelect} WHERE l.id = $1 LIMIT 1`, [listingId]);
  return rows[0] ? hydrateListing(rows[0] as Record<string, unknown>) : null;
}

function dbUserFromPrefix(row: Record<string, unknown>, prefix: "a" | "b"): DbUser {
  return {
    id: Number(row[`${prefix}_id`]),
    steam_id: String(row[`${prefix}_steam_id`]),
    display_name: String(row[`${prefix}_display_name`]),
    avatar_url: row[`${prefix}_avatar_url`] ? String(row[`${prefix}_avatar_url`]) : null,
    profile_url: row[`${prefix}_profile_url`] ? String(row[`${prefix}_profile_url`]) : null,
    trade_url: row[`${prefix}_trade_url`] ? String(row[`${prefix}_trade_url`]) : null,
    last_inventory_sync: row[`${prefix}_last_inventory_sync`] ? String(row[`${prefix}_last_inventory_sync`]) : null
  };
}

async function getOfferItems(offerId: number) {
  const sql = getSql();
  const rows = await sql.query(
    `SELECT oi.user_id, ii.id, ii.asset_id, ii.name, ii.market_hash_name, ii.item_type,
            ii.exterior, ii.rarity, ii.weapon, ii.icon_url, ii.inspect_link,
            ii.tradable, ii.marketable, ii.raw_description
     FROM offer_items oi
     JOIN inventory_items ii ON ii.id = oi.inventory_item_id
     WHERE oi.offer_id = $1
     ORDER BY oi.user_id, ii.market_hash_name NULLS LAST, ii.name`,
    [offerId]
  );

  const byUser: Record<number, DbItem[]> = {};
  for (const row of rows as Array<Record<string, unknown>>) {
    const userId = Number(row.user_id);
    const itemRow = { ...row };
    delete itemRow.user_id;
    byUser[userId] = [...(byUser[userId] ?? []), hydrateItem(itemRow)];
  }
  return byUser;
}

async function hydrateOfferHeader(row: Record<string, unknown>): Promise<TradeOffer> {
  const id = Number(row.offer_id);
  return {
    id,
    threadId: Number(row.thread_id),
    listingId: Number(row.listing_id),
    initiatorUserId: Number(row.initiator_user_id),
    parentOfferId: row.parent_offer_id === null || row.parent_offer_id === undefined ? null : Number(row.parent_offer_id),
    status: String(row.status) as OfferStatus,
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    respondedAt: row.responded_at ? String(row.responded_at) : null,
    userA: dbUserFromPrefix(row, "a"),
    userB: dbUserFromPrefix(row, "b"),
    itemsByUser: await getOfferItems(id)
  };
}

const offerHeaderSelect = `
  SELECT
    o.id AS offer_id, o.thread_id, o.initiator_user_id, o.parent_offer_id,
    o.status, o.note, o.created_at, o.updated_at, o.responded_at,
    t.listing_id, t.user_a_id, t.user_b_id,
    ua.id AS a_id, ua.steam_id AS a_steam_id, ua.display_name AS a_display_name,
    ua.avatar_url AS a_avatar_url, ua.profile_url AS a_profile_url,
    ua.trade_url AS a_trade_url, ua.last_inventory_sync AS a_last_inventory_sync,
    ub.id AS b_id, ub.steam_id AS b_steam_id, ub.display_name AS b_display_name,
    ub.avatar_url AS b_avatar_url, ub.profile_url AS b_profile_url,
    ub.trade_url AS b_trade_url, ub.last_inventory_sync AS b_last_inventory_sync
  FROM offers o
  JOIN trade_threads t ON t.id = o.thread_id
  JOIN users ua ON ua.id = t.user_a_id
  JOIN users ub ON ub.id = t.user_b_id
`;

export async function getOfferById(offerId: number) {
  const sql = getSql();
  const rows = await sql.query(`${offerHeaderSelect} WHERE o.id = $1 LIMIT 1`, [offerId]);
  return rows[0] ? hydrateOfferHeader(rows[0] as Record<string, unknown>) : null;
}

export async function getOffersForUser(userId: number, limit = 60) {
  const sql = getSql();
  const rows = await sql.query(
    `${offerHeaderSelect}
     WHERE t.user_a_id = $1 OR t.user_b_id = $1
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return Promise.all((rows as Array<Record<string, unknown>>).map(hydrateOfferHeader));
}

export async function getThreadMessages(threadId: number, viewerUserId: number) {
  const sql = getSql();

  const participants = await sql.query(
    `SELECT id FROM trade_threads
     WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)
     LIMIT 1`,
    [threadId, viewerUserId]
  );
  if (!participants.length) return [];

  await sql.query(
    `UPDATE messages SET read_at = COALESCE(read_at, NOW())
     WHERE thread_id = $1 AND recipient_user_id = $2`,
    [threadId, viewerUserId]
  );

  const rows = await sql.query(
    `SELECT id, thread_id, sender_user_id, recipient_user_id, body, created_at, read_at
     FROM messages
     WHERE thread_id = $1
     ORDER BY created_at ASC
     LIMIT 250`,
    [threadId]
  );
  return (rows as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    threadId: Number(row.thread_id),
    senderUserId: Number(row.sender_user_id),
    recipientUserId: Number(row.recipient_user_id),
    body: String(row.body),
    createdAt: String(row.created_at),
    readAt: row.read_at ? String(row.read_at) : null
  } satisfies ThreadMessage));
}

async function createNotification(input: {
  userId: number;
  actorUserId?: number | null;
  threadId?: number | null;
  offerId?: number | null;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO notifications (user_id, actor_user_id, thread_id, offer_id, type, title, body, href)
    VALUES (
      ${input.userId},
      ${input.actorUserId ?? null},
      ${input.threadId ?? null},
      ${input.offerId ?? null},
      ${input.type},
      ${input.title},
      ${input.body ?? null},
      ${input.href ?? null}
    )
  `;
}

async function validateOfferItems(userId: number, itemIds: number[]) {
  if (!itemIds.length) return [] as number[];
  const unique = [...new Set(itemIds.map(Number).filter(Number.isFinite))];
  const sql = getSql();
  const rows = await sql.query(
    `SELECT id FROM inventory_items
     WHERE user_id = $1 AND id = ANY($2::bigint[]) AND tradable = true`,
    [userId, unique]
  );
  const valid = (rows as Array<{ id: number }>).map((row) => Number(row.id));
  if (valid.length != unique.length) throw new Error("One or more selected items are no longer tradable.");
  return valid;
}

export async function createTradeOffer(input: {
  initiatorUserId: number;
  otherUserId: number;
  listingId: number;
  initiatorItemIds: number[];
  otherItemIds: number[];
  note?: string | null;
  parentOfferId?: number | null;
}) {
  if (input.initiatorUserId === input.otherUserId) throw new Error("You cannot send an offer to yourself.");
  if (!input.initiatorItemIds.length || !input.otherItemIds.length) throw new Error("Select at least one item on each side of the offer.");

  const listing = await getListingById(input.listingId);
  if (!listing || !["active", "direct"].includes(listing.status)) throw new Error("That trade target is no longer available.");
  if (listing.userId !== input.initiatorUserId && listing.userId !== input.otherUserId) {
    throw new Error("This offer does not match the selected listing.");
  }

  const initiatorItems = await validateOfferItems(input.initiatorUserId, input.initiatorItemIds);
  const otherItems = await validateOfferItems(input.otherUserId, input.otherItemIds);

  if (input.parentOfferId) {
    const parent = await getOfferById(input.parentOfferId);
    if (!parent) throw new Error("The offer you are countering no longer exists.");
    const parentUsers = new Set([parent.userA.id, parent.userB.id]);
    if (parent.listingId !== input.listingId || !parentUsers.has(input.initiatorUserId) || !parentUsers.has(input.otherUserId)) {
      throw new Error("The counteroffer does not match the original trade.");
    }
    if (parent.status !== "pending") throw new Error("Only pending offers can be countered.");
  }

  const userAId = Math.min(input.initiatorUserId, input.otherUserId);
  const userBId = Math.max(input.initiatorUserId, input.otherUserId);
  const sql = getSql();

  const threadRows = await sql.query(
    `INSERT INTO trade_threads (listing_id, user_a_id, user_b_id, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (listing_id, user_a_id, user_b_id)
     DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [input.listingId, userAId, userBId]
  );
  const threadId = Number((threadRows[0] as { id: number }).id);

  const offerRows = await sql.query(
    `INSERT INTO offers (thread_id, initiator_user_id, parent_offer_id, status, note)
     VALUES ($1, $2, $3, 'pending', $4)
     RETURNING id`,
    [threadId, input.initiatorUserId, input.parentOfferId ?? null, input.note?.trim() || null]
  );
  const offerId = Number((offerRows[0] as { id: number }).id);

  const values: Array<[number, number, number]> = [
    ...initiatorItems.map((itemId) => [offerId, input.initiatorUserId, itemId] as [number, number, number]),
    ...otherItems.map((itemId) => [offerId, input.otherUserId, itemId] as [number, number, number])
  ];
  for (const [id, userId, itemId] of values) {
    await sql.query(
      `INSERT INTO offer_items (offer_id, user_id, inventory_item_id)
       VALUES ($1, $2, $3)`,
      [id, userId, itemId]
    );
  }

  if (input.parentOfferId) {
    await sql.query(
      `UPDATE offers SET status = 'countered', updated_at = NOW(), responded_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [input.parentOfferId]
    );
  }

  const initiator = await getUserById(input.initiatorUserId);
  await createNotification({
    userId: input.otherUserId,
    actorUserId: input.initiatorUserId,
    threadId,
    offerId,
    type: input.parentOfferId ? "counteroffer" : "offer",
    title: input.parentOfferId ? "New counteroffer" : "New trade offer",
    body: `${initiator?.display_name ?? "A trader"} sent you ${input.parentOfferId ? "a counteroffer" : "an offer"}.`,
    href: `/offers/${offerId}`
  });

  return offerId;
}

export async function createDirectTradeOffer(input: {
  initiatorUserId: number;
  otherUserId: number;
  initiatorItemIds: number[];
  otherItemIds: number[];
  note?: string | null;
}) {
  const initiatorUserId = Number(input.initiatorUserId);
  const otherUserId = Number(input.otherUserId);
  if (!Number.isInteger(initiatorUserId) || !Number.isInteger(otherUserId)) {
    throw new Error("Invalid ItemFuse user for this offer.");
  }
  if (initiatorUserId === otherUserId) throw new Error("You cannot send an offer to yourself.");
  if (!input.initiatorItemIds.length || !input.otherItemIds.length) throw new Error("Select at least one item on each side of the offer.");

  // Validate both sides before creating the hidden direct-offer anchor.
  await validateOfferItems(initiatorUserId, input.initiatorItemIds);
  await validateOfferItems(otherUserId, input.otherItemIds);

  const sql = getSql();
  const anchorItemId = Number(input.otherItemIds[0]);
  const listingRows = await sql.query(
    `INSERT INTO listings (user_id, title, notes, status, created_at, updated_at)
     VALUES ($1, 'Direct friend offer', NULL, 'direct', NOW(), NOW())
     RETURNING id`,
    [otherUserId]
  );
  const listingId = Number((listingRows[0] as { id: number }).id);

  try {
    await sql.query(
      `INSERT INTO listing_items (listing_id, inventory_item_id) VALUES ($1, $2)`,
      [listingId, anchorItemId]
    );
    await sql.query(
      `INSERT INTO wanted_items (listing_id, market_hash_name, min_exterior, max_value_delta_percent)
       VALUES ($1, '*', NULL, 50)`,
      [listingId]
    );

    return await createTradeOffer({
      initiatorUserId,
      otherUserId,
      listingId,
      initiatorItemIds: input.initiatorItemIds,
      otherItemIds: input.otherItemIds,
      note: input.note ?? null,
      parentOfferId: null,
    });
  } catch (error) {
    // listing_items does not cascade when its listing is deleted, so remove child
    // rows first. Never let cleanup hide the original offer error.
    try {
      await sql.query(`DELETE FROM wanted_items WHERE listing_id = $1`, [listingId]);
      await sql.query(`DELETE FROM listing_items WHERE listing_id = $1`, [listingId]);
      await sql.query(`DELETE FROM listings WHERE id = $1 AND status = 'direct'`, [listingId]);
    } catch (cleanupError) {
      console.error("Direct-offer cleanup failed", cleanupError);
    }
    throw error;
  }
}

export async function actOnOffer(input: {
  offerId: number;
  userId: number;
  action: "accept" | "reject" | "cancel";
}) {
  const offer = await getOfferById(input.offerId);
  if (!offer) throw new Error("Offer not found.");
  const participantIds = [offer.userA.id, offer.userB.id];
  if (!participantIds.includes(input.userId)) throw new Error("You do not have access to this offer.");
  if (offer.status !== "pending") throw new Error("This offer is no longer pending.");

  const otherUserId = offer.userA.id === input.userId ? offer.userB.id : offer.userA.id;
  if (input.action === "cancel" && offer.initiatorUserId !== input.userId) throw new Error("Only the sender can cancel this offer.");
  if ((input.action === "accept" || input.action === "reject") && offer.initiatorUserId === input.userId) {
    throw new Error("The sender cannot accept or reject their own offer.");
  }

  const status: OfferStatus = input.action === "accept" ? "accepted" : input.action === "reject" ? "rejected" : "cancelled";
  const sql = getSql();
  await sql.query(
    `UPDATE offers
     SET status = $2, updated_at = NOW(), responded_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [input.offerId, status]
  );

  if (status === "accepted" || status === "rejected" || status === "cancelled") {
    await sql.query(
      `UPDATE listings SET status = 'closed', updated_at = NOW()
       WHERE id = $1 AND status = 'direct'`,
      [offer.listingId]
    );
  }

  const actor = await getUserById(input.userId);
  const title = status === "accepted" ? "Offer accepted" : status === "rejected" ? "Offer declined" : "Offer cancelled";
  await createNotification({
    userId: otherUserId,
    actorUserId: input.userId,
    threadId: offer.threadId,
    offerId: offer.id,
    type: status,
    title,
    body: `${actor?.display_name ?? "A trader"} ${status === "accepted" ? "accepted" : status === "rejected" ? "declined" : "cancelled"} the offer.`,
    href: `/offers/${offer.id}`
  });

  return status;
}

export async function sendThreadMessage(input: {
  threadId: number;
  senderUserId: number;
  body: string;
}) {
  const body = input.body.trim();
  if (!body) throw new Error("Enter a message.");
  if (body.length > 2000) throw new Error("Messages are limited to 2,000 characters.");

  const sql = getSql();
  const threadRows = await sql.query(
    `SELECT user_a_id, user_b_id FROM trade_threads
     WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)
     LIMIT 1`,
    [input.threadId, input.senderUserId]
  );
  if (!threadRows.length) throw new Error("Trade thread not found.");
  const thread = threadRows[0] as { user_a_id: number; user_b_id: number };
  const recipientUserId = Number(thread.user_a_id) === input.senderUserId ? Number(thread.user_b_id) : Number(thread.user_a_id);

  const rows = await sql.query(
    `INSERT INTO messages (thread_id, sender_user_id, recipient_user_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.threadId, input.senderUserId, recipientUserId, body]
  );

  const sender = await getUserById(input.senderUserId);
  const latestOfferRows = await sql.query(
    `SELECT id FROM offers WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [input.threadId]
  );
  const latestOfferId = latestOfferRows[0] ? Number((latestOfferRows[0] as { id: number }).id) : null;
  await createNotification({
    userId: recipientUserId,
    actorUserId: input.senderUserId,
    threadId: input.threadId,
    offerId: latestOfferId,
    type: "message",
    title: "New trade message",
    body: `${sender?.display_name ?? "A trader"} sent you a message.`,
    href: latestOfferId ? `/offers/${latestOfferId}` : "/trades"
  });

  return Number((rows[0] as { id: number }).id);
}

export async function getNotificationsForUser(userId: number, limit = 80) {
  const sql = getSql();
  const rows = await sql.query(
    `SELECT id, user_id, actor_user_id, thread_id, offer_id, type, title, body, href, read_at, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return (rows as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    actorUserId: row.actor_user_id === null ? null : Number(row.actor_user_id),
    threadId: row.thread_id === null ? null : Number(row.thread_id),
    offerId: row.offer_id === null ? null : Number(row.offer_id),
    type: String(row.type),
    title: String(row.title),
    body: row.body ? String(row.body) : null,
    href: row.href ? String(row.href) : null,
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at)
  } satisfies UserNotification));
}

export async function getUnreadNotificationCount(userId: number) {
  const sql = getSql();
  const rows = await sql.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return Number((rows[0] as { count: number }).count ?? 0);
}

export async function markNotificationsRead(userId: number, notificationId?: number | null) {
  const sql = getSql();
  if (notificationId) {
    await sql.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  } else {
    await sql.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
  }
}

export async function getThreadById(threadId: number, userId: number) {
  const sql = getSql();
  const rows = await sql.query(
    `SELECT id, listing_id, user_a_id, user_b_id, created_at, updated_at
     FROM trade_threads
     WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)
     LIMIT 1`,
    [threadId, userId]
  );
  if (!rows.length) return null;
  const row = rows[0] as Record<string, unknown>;
  return {
    id: Number(row.id),
    listingId: Number(row.listing_id),
    userAId: Number(row.user_a_id),
    userBId: Number(row.user_b_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  } satisfies TradeThread;
}
