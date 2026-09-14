import type { BlueGem, Cosmetic, DbItem } from "@/lib/db";
import type { HistoricalCalibration } from "@/lib/appraisal";

export type DisplayCosmetic = {
  name: string;
  imageUrl: string | null;
  wear: number | null;
  priceCents: number | null;
};

export type ItemDisplayData = {
  id: string;
  name: string;
  imageUrl: string | null;
  subtitle: string | null;
  itemType: string | null;
  exterior: string | null;
  rarity: string | null;
  weapon: string | null;
  tradable: boolean | null;
  marketable: boolean | null;
  enriched: boolean;
  floatValue: number | null;
  paintSeed: number | null;
  paintIndex: number | null;
  phase: string | null;
  fade: number | null;
  blueGem: BlueGem | null;
  estimatedValueCents: number | null;
  steamPriceCents: number | null;
  realPriceCents: number | null;
  realMarket: string | null;
  stickers: DisplayCosmetic[];
  charms: DisplayCosmetic[];
  patches: DisplayCosmetic[];
  inspectLink: string | null;
  dbItemId: number | null;
  historyCalibration: HistoricalCalibration | null;
};

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

type RawDescription = {
  descriptions?: Array<{ name?: string; value?: string }>;
};

type SteamLikeItem = {
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
  raw_description: string;
};

function finite(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function providerCosmetics(items: RawCosmetic[] | undefined): DisplayCosmetic[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item?.name).map((item) => ({
    name: String(item.name),
    imageUrl: item.image ? String(item.image) : null,
    wear: finite(item.wear),
    priceCents: finite(item.price)
  }));
}

function descriptionCosmetics(description: RawDescription, lineName: "sticker_info" | "keychain_info"): DisplayCosmetic[] {
  const html = description.descriptions?.find((line) => line.name === lineName)?.value;
  if (!html) return [];
  const result: DisplayCosmetic[] = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? null;
    const title = tag.match(/\btitle=["']([^"']+)["']/i)?.[1] ?? "";
    const name = title.replace(/^Sticker:\s*/i, "").replace(/^Charm:\s*/i, "").replace(/^Sticker Slab:\s*/i, "").trim();
    if (name) result.push({ name, imageUrl: src, wear: null, priceCents: null });
  }
  return result;
}

export function dbItemToDisplay(item: DbItem): ItemDisplayData {
  return {
    id: String(item.id),
    name: item.market_hash_name ?? item.name,
    imageUrl: item.icon_url,
    subtitle: [item.weapon, item.exterior].filter(Boolean).join(" • ") || item.item_type,
    itemType: item.item_type,
    exterior: item.exterior,
    rarity: item.rarity,
    weapon: item.weapon,
    tradable: item.tradable,
    marketable: item.marketable,
    enriched: item.enriched,
    floatValue: item.float_value,
    paintSeed: item.paint_seed,
    paintIndex: item.paint_index,
    phase: item.phase,
    fade: item.fade,
    blueGem: item.blue_gem,
    estimatedValueCents: item.estimated_value_cents,
    steamPriceCents: item.steam_price_cents,
    realPriceCents: item.real_price_cents,
    realMarket: item.real_market,
    stickers: item.stickers,
    charms: item.charms,
    patches: item.patches,
    inspectLink: item.inspect_link,
    dbItemId: item.id,
    historyCalibration: item.history_calibration
  };
}

export function steamItemToDisplay(item: SteamLikeItem): ItemDisplayData {
  let description: RawDescription = {};
  let enrichment: RawEnrichment | null = null;
  try {
    const parsed = JSON.parse(item.raw_description) as { description?: RawDescription; enrichment?: RawEnrichment } & RawDescription;
    description = parsed.description ?? parsed;
    enrichment = parsed.enrichment ?? null;
  } catch {
    // Leave raw metadata empty if Steam returned malformed JSON.
  }

  const stickers = providerCosmetics(enrichment?.stickers);
  const charms = providerCosmetics(enrichment?.charms);

  return {
    id: item.asset_id,
    name: item.market_hash_name ?? item.name,
    imageUrl: item.icon_url,
    subtitle: [item.weapon, item.exterior].filter(Boolean).join(" • ") || item.item_type,
    itemType: item.item_type,
    exterior: item.exterior,
    rarity: item.rarity,
    weapon: item.weapon,
    tradable: item.tradable,
    marketable: item.marketable,
    enriched: enrichment?.provider === "steamdataapi",
    floatValue: finite(enrichment?.float),
    paintSeed: finite(enrichment?.paintSeed),
    paintIndex: finite(enrichment?.paintIndex),
    phase: enrichment?.phase ? String(enrichment.phase) : null,
    fade: finite(enrichment?.fade),
    blueGem: enrichment?.blueGem ?? null,
    estimatedValueCents: finite(enrichment?.prices?.value),
    steamPriceCents: finite(enrichment?.prices?.latest),
    realPriceCents: finite(enrichment?.prices?.real),
    realMarket: enrichment?.prices?.realMarket ? String(enrichment.prices.realMarket) : null,
    stickers: stickers.length ? stickers : descriptionCosmetics(description, "sticker_info"),
    charms: charms.length ? charms : descriptionCosmetics(description, "keychain_info"),
    patches: providerCosmetics(enrichment?.patches),
    inspectLink: enrichment?.inspectLink ?? item.inspect_link,
    dbItemId: null,
    historyCalibration: enrichment?.historyCalibration ?? null
  };
}

export function catalogItemToDisplay(options: {
  id: string | number;
  name: string;
  imageUrl?: string | null;
  priceCents?: number | null;
  subtitle?: string | null;
  exterior?: string | null;
  phase?: string | null;
  maxFloat?: number | null;
}): ItemDisplayData {
  return {
    id: String(options.id),
    name: options.name,
    imageUrl: options.imageUrl ?? null,
    subtitle: options.subtitle ?? options.exterior ?? "CS2 market item",
    itemType: "CS2 market item",
    exterior: options.exterior ?? null,
    rarity: null,
    weapon: null,
    tradable: null,
    marketable: null,
    enriched: false,
    floatValue: null,
    paintSeed: null,
    paintIndex: null,
    phase: options.phase ?? null,
    fade: null,
    blueGem: null,
    estimatedValueCents: options.priceCents ?? null,
    steamPriceCents: null,
    realPriceCents: null,
    realMarket: null,
    stickers: [],
    charms: [],
    patches: [],
    inspectLink: null,
    dbItemId: null,
    historyCalibration: null
  };
}

export function cosmeticToDisplay(item: Cosmetic): DisplayCosmetic {
  return item;
}
