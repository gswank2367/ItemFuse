import type { HistoricalCalibration } from "@/lib/appraisal";

type SteamPoint = {
  date?: string;
  price?: number | null;
  sold?: number | null;
  origin?: string | null;
};

type MarketPoint = {
  date?: string;
  price?: number | null;
  quantity?: number | null;
};

type SteamHistoryResponse = {
  currency?: string;
  source?: string;
  data?: SteamPoint[];
};

type MarketsHistoryResponse = {
  currency?: string;
  source?: string;
  metric?: string;
  markets?: Record<string, MarketPoint[]>;
};

type PhaseHistoryResponse = {
  currency?: string;
  source?: string;
  phases?: Record<string, Record<string, MarketPoint[]>>;
};

function finite(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  if (low === high) return sorted[low];
  const weight = position - low;
  return sorted[low] * (1 - weight) + sorted[high] * weight;
}

function median(values: number[]) {
  return percentile(values, 0.5);
}

function recentByDays<T extends { date?: string }>(rows: T[], days: number) {
  const dated = rows
    .map((row) => ({ row, time: row.date ? Date.parse(row.date) : Number.NaN }))
    .filter((entry) => Number.isFinite(entry.time));
  if (!dated.length) return rows;
  const newest = Math.max(...dated.map((entry) => entry.time));
  const cutoff = newest - days * 86400000;
  return dated.filter((entry) => entry.time >= cutoff).map((entry) => entry.row);
}

function normalizedVolatility(values: number[]) {
  if (values.length < 3) return null;
  const med = median(values);
  if (!med || med <= 0) return null;
  const deviations = values.map((value) => Math.abs(value - med));
  const mad = median(deviations);
  return mad === null ? null : (mad / med) * 100;
}

function trendPercent(rows: SteamPoint[]) {
  const valid = rows
    .filter((row) => finite(row.price) !== null && row.date)
    .sort((a, b) => Date.parse(a.date!) - Date.parse(b.date!));
  if (valid.length < 8) return null;
  const latestTime = Date.parse(valid[valid.length - 1].date!);
  const recent = valid.filter((row) => latestTime - Date.parse(row.date!) <= 14 * 86400000);
  const prior = valid.filter((row) => {
    const age = latestTime - Date.parse(row.date!);
    return age > 14 * 86400000 && age <= 28 * 86400000;
  });
  const recentMedian = median(recent.map((row) => Number(row.price)).filter((value) => Number.isFinite(value)));
  const priorMedian = median(prior.map((row) => Number(row.price)).filter((value) => Number.isFinite(value)));
  if (!recentMedian || !priorMedian) return null;
  return ((recentMedian / priorMedian) - 1) * 100;
}

function dailyCrossMarketMedians(markets: Record<string, MarketPoint[]> | undefined) {
  if (!markets) return [] as Array<{ date: string; price: number }>;
  const byDate = new Map<string, number[]>();
  for (const rows of Object.values(markets)) {
    for (const row of rows ?? []) {
      const price = finite(row.price);
      if (!row.date || price === null) continue;
      const list = byDate.get(row.date) ?? [];
      list.push(price);
      byDate.set(row.date, list);
    }
  }
  return [...byDate.entries()]
    .map(([date, values]) => ({ date, price: median(values) ?? 0 }))
    .filter((row) => row.price > 0)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

function summarizeMarketRows(markets: Record<string, MarketPoint[]> | undefined) {
  const daily = dailyCrossMarketMedians(markets);
  const prices90 = recentByDays(daily, 90).map((row) => row.price);
  const prices30 = recentByDays(daily, 30).map((row) => row.price);
  const marketCount = markets ? Object.values(markets).filter((rows) => Array.isArray(rows) && rows.length > 0).length : 0;
  return {
    median30Cents: median(prices30),
    median90Cents: median(prices90),
    p25Cents: percentile(prices90, 0.25),
    p75Cents: percentile(prices90, 0.75),
    observations: prices90.length,
    marketCount,
  };
}

function summarizePhase(phases: PhaseHistoryResponse["phases"], phase: string | null | undefined) {
  if (!phase || !phases) return null;
  const exactKey = Object.keys(phases).find((key) => key.toLowerCase() === phase.toLowerCase());
  if (!exactKey) return null;
  const summary = summarizeMarketRows(phases[exactKey]);
  if (!summary.median30Cents && !summary.median90Cents) return null;
  return {
    phase: exactKey,
    ...summary,
  };
}

async function historyFetch<T>(url: URL) {
  const key = process.env.STEAMDATA_API_KEY?.trim();
  if (!key) return { ok: false as const, status: 0, data: null as T | null, reason: "not-configured" };

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "User-Agent": "ItemFuse/1.0 (+https://itemfuse.com)",
    },
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    let reason = `http-${response.status}`;
    try {
      const body = await response.json() as { error?: string; reason?: string };
      reason = body.error ?? body.reason ?? reason;
    } catch {
      // Keep HTTP status as the reason.
    }
    return { ok: false as const, status: response.status, data: null as T | null, reason };
  }

  return { ok: true as const, status: response.status, data: await response.json() as T, reason: null };
}

export async function fetchHistoricalCalibration(marketHashName: string, phase?: string | null): Promise<HistoricalCalibration> {
  const name = marketHashName.trim();
  if (!name) return { available: false, reason: "missing-name", source: "steamdataapi", days: 90, asOf: null, sales: null, markets: null, phase: null };

  const base = `https://steamdataapi.com/api/v1/items/${encodeURIComponent(name)}/history`;
  const steamUrl = new URL(base);
  steamUrl.searchParams.set("game", "cs2");
  steamUrl.searchParams.set("currency", "USD");
  steamUrl.searchParams.set("source", "steam");
  steamUrl.searchParams.set("days", "90");

  const marketsUrl = new URL(base);
  marketsUrl.searchParams.set("game", "cs2");
  marketsUrl.searchParams.set("currency", "USD");
  marketsUrl.searchParams.set("source", "markets");
  marketsUrl.searchParams.set("days", "90");
  marketsUrl.searchParams.set("metric", "close");

  const phaseUrl = phase ? new URL(base) : null;
  if (phaseUrl) {
    phaseUrl.searchParams.set("game", "cs2");
    phaseUrl.searchParams.set("currency", "USD");
    phaseUrl.searchParams.set("source", "phases");
    phaseUrl.searchParams.set("days", "90");
    phaseUrl.searchParams.set("phase", phase!);
  }

  const [steamResult, marketsResult, phaseResult] = await Promise.all([
    historyFetch<SteamHistoryResponse>(steamUrl),
    historyFetch<MarketsHistoryResponse>(marketsUrl),
    phaseUrl ? historyFetch<PhaseHistoryResponse>(phaseUrl) : Promise.resolve(null),
  ]);

  if (!steamResult.ok && !marketsResult.ok && (!phaseResult || !phaseResult.ok)) {
    const reason = steamResult.reason === "plan_forbidden" || marketsResult.reason === "plan_forbidden" || phaseResult?.reason === "plan_forbidden"
      ? "plan-forbidden"
      : steamResult.reason ?? marketsResult.reason ?? phaseResult?.reason ?? "unavailable";
    return { available: false, reason, source: "steamdataapi", days: 90, asOf: null, sales: null, markets: null, phase: null };
  }

  const saleRows = steamResult.ok ? (steamResult.data?.data ?? []) : [];
  const sale90 = recentByDays(saleRows, 90);
  const sale30 = recentByDays(saleRows, 30);
  const salePrices90 = sale90.map((row) => finite(row.price)).filter((value): value is number => value !== null);
  const salePrices30 = sale30.map((row) => finite(row.price)).filter((value): value is number => value !== null);
  const sold90 = sale90.reduce((sum, row) => sum + (finite(row.sold) ?? 0), 0);
  const sales = salePrices90.length ? {
    median30Cents: median(salePrices30),
    median90Cents: median(salePrices90),
    p25Cents: percentile(salePrices90, 0.25),
    p75Cents: percentile(salePrices90, 0.75),
    observations: salePrices90.length,
    sold90d: sold90,
    trendPercent: trendPercent(saleRows),
    volatilityPercent: normalizedVolatility(salePrices90),
  } : null;

  const markets = marketsResult.ok ? summarizeMarketRows(marketsResult.data?.markets) : null;
  const phaseSummary = phaseResult?.ok ? summarizePhase(phaseResult.data?.phases, phase) : null;
  const asOfCandidates = [
    ...saleRows.map((row) => row.date),
    ...dailyCrossMarketMedians(marketsResult.ok ? marketsResult.data?.markets : undefined).map((row) => row.date),
  ].filter((value): value is string => Boolean(value));
  const asOf = asOfCandidates.length ? asOfCandidates.sort().at(-1) ?? null : null;

  return {
    available: Boolean(sales || markets || phaseSummary),
    reason: null,
    source: "steamdataapi",
    days: 90,
    asOf,
    sales,
    markets,
    phase: phaseSummary,
  };
}
