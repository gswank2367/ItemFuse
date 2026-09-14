import { getCatalogByNamesFromInventory, searchCatalogFromInventory } from "@/lib/db";

export type CatalogItem = {
  marketHashName: string;
  imageUrl: string | null;
  priceCents: number | null;
  source: "steamdataapi" | "inventory";
};

type SteamDataItem = {
  marketHashName?: string;
  image?: { url?: string | null } | null;
  prices?: { best?: number | null; real?: number | null; latest?: number | null } | null;
};

type SteamDataAllResponse = {
  data?: SteamDataItem[];
};


type CommunityCatalogItem = {
  market_hash_name?: string | null;
  name?: string | null;
  image?: string | null;
};

async function fetchCommunityCatalog(): Promise<CatalogItem[]> {
  try {
    const response = await fetch("https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/all.json", {
      next: { revalidate: 86400 }
    });
    if (!response.ok) return [];
    const payload = await response.json() as Record<string, CommunityCatalogItem> | CommunityCatalogItem[];
    const rows = Array.isArray(payload) ? payload : Object.values(payload);
    return rows
      .filter((item) => Boolean(item?.market_hash_name))
      .map((item) => ({ marketHashName: String(item.market_hash_name), imageUrl: item.image ? String(item.image) : null, priceCents: null, source: "inventory" as const }));
  } catch { return []; }
}

function normalizeQuery(value: string) {
  return value.toLowerCase().replace(/[™★]/g, "").replace(/\s+/g, " ").trim();
}

function itemPrice(item: SteamDataItem) {
  return item.prices?.real ?? item.prices?.best ?? item.prices?.latest ?? null;
}

async function fetchFullCatalog(): Promise<CatalogItem[]> {
  const key = process.env.STEAMDATA_API_KEY?.trim();
  if (!key) return [];
  try {
    const response = await fetch("https://steamdataapi.com/api/v1/items/all?game=cs2&images=1", {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 21600 }
    });
    if (!response.ok) return [];
    const payload = await response.json() as SteamDataAllResponse;
    return (payload.data ?? [])
      .filter((item): item is SteamDataItem & { marketHashName: string } => Boolean(item.marketHashName))
      .map((item) => ({
        marketHashName: item.marketHashName,
        imageUrl: item.image?.url ?? null,
        priceCents: itemPrice(item),
        source: "steamdataapi" as const
      }));
  } catch {
    return [];
  }
}

async function fetchSingleCatalogItem(name: string): Promise<CatalogItem | null> {
  const key = process.env.STEAMDATA_API_KEY?.trim();
  if (!key) return null;
  try {
    const response = await fetch(`https://steamdataapi.com/api/v1/items/${encodeURIComponent(name)}?game=cs2`, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 86400 }
    });
    if (!response.ok) return null;
    const item = await response.json() as SteamDataItem;
    if (!item.marketHashName) return null;
    return {
      marketHashName: item.marketHashName,
      imageUrl: item.image?.url ?? null,
      priceCents: itemPrice(item),
      source: "steamdataapi"
    };
  } catch {
    return null;
  }
}

export async function searchCatalog(query: string, limit = 12): Promise<CatalogItem[]> {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];

  let fullCatalog = await fetchFullCatalog();
  if (!fullCatalog.length) fullCatalog = await fetchCommunityCatalog();
  if (fullCatalog.length) {
    const tokens = q.split(" ").filter(Boolean);
    const ranked = fullCatalog
      .map((item) => {
        const name = normalizeQuery(item.marketHashName);
        if (!tokens.every((token) => name.includes(token))) return null;
        let score = 0;
        if (name === q) score += 100;
        if (name.startsWith(q)) score += 50;
        if (name.includes(q)) score += 25;
        score += Math.max(0, 20 - Math.abs(name.length - q.length) / 4);
        return { item, score };
      })
      .filter((entry): entry is { item: CatalogItem; score: number } => Boolean(entry))
      .sort((a, b) => b.score - a.score || a.item.marketHashName.localeCompare(b.item.marketHashName))
      .slice(0, limit)
      .map((entry) => entry.item);
    if (ranked.length) return ranked;
  }

  return searchCatalogFromInventory(query, limit);
}

export async function getCatalogItemsByNames(names: string[]): Promise<Map<string, CatalogItem>> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const inventoryRows = await getCatalogByNamesFromInventory(unique);
  const result = new Map<string, CatalogItem>(inventoryRows);
  const missing = unique.filter((name) => !result.has(name));
  if (missing.length) {
    const providerRows = await Promise.all(missing.slice(0, 24).map(fetchSingleCatalogItem));
    for (const row of providerRows) if (row) result.set(row.marketHashName, row);
  }
  return result;
}
