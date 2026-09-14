export type AppraisalConfidence = "high" | "medium" | "low" | "unavailable";

export type HistoricalCalibration = {
  available: boolean;
  reason: string | null;
  source: "steamdataapi";
  days: number;
  asOf: string | null;
  sales: {
    median30Cents: number | null;
    median90Cents: number | null;
    p25Cents: number | null;
    p75Cents: number | null;
    observations: number;
    sold90d: number;
    trendPercent: number | null;
    volatilityPercent: number | null;
  } | null;
  markets: {
    median30Cents: number | null;
    median90Cents: number | null;
    p25Cents: number | null;
    p75Cents: number | null;
    observations: number;
    marketCount: number;
  } | null;
  phase: {
    phase: string;
    median30Cents: number | null;
    median90Cents: number | null;
    p25Cents: number | null;
    p75Cents: number | null;
    observations: number;
    marketCount: number;
  } | null;
};

export type AppraisalAdjustment = {
  key: "float" | "blue-gem" | "fade" | "phase";
  label: string;
  detail: string;
  lowPercent: number;
  highPercent: number;
};

export type AppraisalInput = {
  name?: string | null;
  exterior?: string | null;
  floatValue?: number | null;
  phase?: string | null;
  fade?: number | null;
  blueGem?: {
    tier?: string | null;
    rank?: number | null;
    totalRanked?: number | null;
    playsideBlue?: number | null;
    backsideBlue?: number | null;
  } | null;
  estimatedValueCents?: number | null;
  steamPriceCents?: number | null;
  realPriceCents?: number | null;
  historyCalibration?: HistoricalCalibration | null;
};

export type ItemAppraisal = {
  baseLowCents: number | null;
  baseHighCents: number | null;
  lowCents: number | null;
  highCents: number | null;
  midpointCents: number | null;
  sourceCount: number;
  confidence: AppraisalConfidence;
  floatQualityPercent: number | null;
  blueCoveragePercent: number | null;
  adjustments: AppraisalAdjustment[];
  historyUsed: boolean;
  historyNote: string | null;
  historicalMidpointCents: number | null;
};

export type AppraisalTotal = {
  lowCents: number;
  highCents: number;
  midpointCents: number;
  pricedItems: number;
  totalItems: number;
};

const EXTERIOR_BANDS: Record<string, [number, number]> = {
  "factory new": [0, 0.07],
  "minimal wear": [0.07, 0.15],
  "field-tested": [0.15, 0.38],
  "field tested": [0.15, 0.38],
  "well-worn": [0.38, 0.45],
  "well worn": [0.38, 0.45],
  "battle-scarred": [0.45, 1],
  "battle scarred": [0.45, 1],
};

function finitePositive(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function uniqueSorted(values: Array<number | null | undefined>) {
  return [...new Set(values.map(finitePositive).filter((value): value is number => value !== null))].sort((a, b) => a - b);
}

function exteriorBand(exterior: string | null | undefined): [number, number] | null {
  if (!exterior) return null;
  const normalized = exterior.toLowerCase().trim();
  return EXTERIOR_BANDS[normalized] ?? null;
}

function floatQuality(floatValue: number | null | undefined, exterior: string | null | undefined) {
  const value = finitePositive(floatValue);
  if (value === null) return null;
  const band = exteriorBand(exterior);
  if (!band) return clamp(1 - value, 0, 1);
  const [min, max] = band;
  if (max <= min) return null;
  return clamp((max - value) / (max - min), 0, 1);
}

function floatAdjustment(quality: number | null): AppraisalAdjustment | null {
  if (quality === null || quality < 0.5) return null;
  if (quality >= 0.999) return { key: "float", label: "Exceptional float", detail: `Top ~0.1% of this wear band`, lowPercent: 18, highPercent: 45 };
  if (quality >= 0.99) return { key: "float", label: "Elite float", detail: `Top ~1% of this wear band`, lowPercent: 10, highPercent: 28 };
  if (quality >= 0.95) return { key: "float", label: "Very low float", detail: `Top ~5% of this wear band`, lowPercent: 5, highPercent: 15 };
  if (quality >= 0.8) return { key: "float", label: "Low float", detail: `Top ~20% of this wear band`, lowPercent: 2, highPercent: 8 };
  return { key: "float", label: "Above-average float", detail: `Upper half of this wear band`, lowPercent: 0, highPercent: 3 };
}

function parseTier(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/tier\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function blueGemAdjustment(blueGem: AppraisalInput["blueGem"]): { adjustment: AppraisalAdjustment | null; coverage: number | null } {
  if (!blueGem) return { adjustment: null, coverage: null };
  const play = finitePositive(blueGem.playsideBlue);
  const back = finitePositive(blueGem.backsideBlue);
  const coverage = play !== null && back !== null ? play * 0.75 + back * 0.25 : play ?? back;
  const tier = parseTier(blueGem.tier);

  let low = 0;
  let high = 0;
  if (tier === 1) [low, high] = [45, 130];
  else if (tier === 2) [low, high] = [20, 65];
  else if (tier === 3) [low, high] = [8, 30];
  else if (tier !== null && tier >= 4) [low, high] = [3, 15];
  else if (coverage !== null && coverage >= 90) [low, high] = [25, 75];
  else if (coverage !== null && coverage >= 75) [low, high] = [12, 40];
  else if (coverage !== null && coverage >= 60) [low, high] = [4, 20];

  if (high === 0) return { adjustment: null, coverage };

  const rank = finitePositive(blueGem.rank);
  const total = finitePositive(blueGem.totalRanked);
  if (rank !== null && total !== null && total > 0) {
    const percentile = rank / total;
    if (percentile <= 0.01) {
      low *= 1.35;
      high *= 1.45;
    } else if (percentile <= 0.05) {
      low *= 1.15;
      high *= 1.25;
    }
  }

  const detailParts: string[] = [];
  if (blueGem.tier) detailParts.push(blueGem.tier);
  if (coverage !== null) detailParts.push(`${coverage.toFixed(1)}% weighted blue`);
  if (rank !== null && total !== null) detailParts.push(`rank #${rank}/${total}`);

  return {
    coverage,
    adjustment: {
      key: "blue-gem",
      label: "Blue Gem collector premium",
      detail: detailParts.join(" • ") || "Pattern-specific collector premium",
      lowPercent: Math.round(low),
      highPercent: Math.round(high),
    },
  };
}

function fadeAdjustment(fade: number | null | undefined): AppraisalAdjustment | null {
  const value = finitePositive(fade);
  if (value === null || value < 90) return null;
  if (value >= 99) return { key: "fade", label: "High Fade %", detail: `${value.toFixed(2)}% fade`, lowPercent: 8, highPercent: 25 };
  if (value >= 95) return { key: "fade", label: "Strong Fade %", detail: `${value.toFixed(2)}% fade`, lowPercent: 3, highPercent: 12 };
  return { key: "fade", label: "Above-average Fade %", detail: `${value.toFixed(2)}% fade`, lowPercent: 1, highPercent: 6 };
}

function phaseAdjustment(phase: string | null | undefined): AppraisalAdjustment | null {
  const normalized = (phase ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (/ruby|sapphire|black pearl/.test(normalized)) return { key: "phase", label: "Premium Doppler gem phase", detail: phase!, lowPercent: 15, highPercent: 60 };
  if (/phase\s*2|p2/.test(normalized)) return { key: "phase", label: "Doppler Phase 2 signal", detail: phase!, lowPercent: 2, highPercent: 8 };
  if (/phase\s*4|p4/.test(normalized)) return { key: "phase", label: "Doppler Phase 4 signal", detail: phase!, lowPercent: 1, highPercent: 6 };
  if (/phase\s*[13]|p[13]/.test(normalized)) return { key: "phase", label: "Doppler phase signal", detail: phase!, lowPercent: 0, highPercent: 3 };
  return null;
}

function weightedAverage(rows: Array<{ value: number | null | undefined; weight: number }>) {
  const valid = rows.filter((row) => finitePositive(row.value) !== null && row.weight > 0);
  if (!valid.length) return null;
  const weight = valid.reduce((sum, row) => sum + row.weight, 0);
  return valid.reduce((sum, row) => sum + Number(row.value) * row.weight, 0) / weight;
}

function historicalBase(prices: number[], history: HistoricalCalibration | null | undefined, phase: string | null | undefined) {
  const currentMid = prices.length ? prices[Math.floor((prices.length - 1) / 2)] : null;
  if (!history?.available) {
    return { low: prices[0] ?? null, high: prices.at(-1) ?? null, midpoint: currentMid, used: false, note: null as string | null };
  }

  const phaseHistory = phase && history.phase ? history.phase : null;
  const sales = history.sales;
  const markets = history.markets;
  const historicalMid = phaseHistory
    ? weightedAverage([
        { value: currentMid, weight: 0.35 },
        { value: phaseHistory.median30Cents ?? phaseHistory.median90Cents, weight: 0.65 },
      ])
    : weightedAverage([
        { value: currentMid, weight: 0.5 },
        { value: sales?.median30Cents ?? sales?.median90Cents, weight: 0.3 },
        { value: markets?.median30Cents ?? markets?.median90Cents, weight: 0.2 },
      ]);

  if (historicalMid === null) {
    return { low: prices[0] ?? null, high: prices.at(-1) ?? null, midpoint: currentMid, used: false, note: null as string | null };
  }

  const trend = clamp((sales?.trendPercent ?? 0) * 0.2, -8, 8) / 100;
  const shiftedMid = historicalMid * (1 + trend);
  const histP25 = phaseHistory?.p25Cents ?? sales?.p25Cents ?? markets?.p25Cents ?? null;
  const histP75 = phaseHistory?.p75Cents ?? sales?.p75Cents ?? markets?.p75Cents ?? null;
  const historicalWidth = histP25 !== null && histP75 !== null && shiftedMid > 0
    ? Math.max(Math.abs(shiftedMid - histP25), Math.abs(histP75 - shiftedMid)) / shiftedMid
    : 0;
  const currentLow = prices[0] ?? shiftedMid;
  const currentHigh = prices.at(-1) ?? shiftedMid;
  const currentWidth = shiftedMid > 0 ? Math.max(Math.abs(shiftedMid - currentLow), Math.abs(currentHigh - shiftedMid)) / shiftedMid : 0;
  const volatilityWidth = clamp((sales?.volatilityPercent ?? 0) / 100 * 0.55, 0, 0.15);
  const width = clamp(Math.max(0.04, historicalWidth, currentWidth, volatilityWidth), 0.04, 0.30);
  const low = Math.max(0, Math.round(shiftedMid * (1 - width)));
  const high = Math.max(low, Math.round(shiftedMid * (1 + width)));

  const sourceParts: string[] = [];
  if (phaseHistory) sourceParts.push(`${phaseHistory.phase} phase history`);
  if (sales?.observations) sourceParts.push(`${sales.observations} Steam sale days`);
  if (markets?.marketCount) sourceParts.push(`${markets.marketCount} marketplaces`);
  if (sales?.trendPercent !== null && sales?.trendPercent !== undefined) sourceParts.push(`${sales.trendPercent >= 0 ? "+" : ""}${sales.trendPercent.toFixed(1)}% 14d trend`);

  return { low, high, midpoint: Math.round(shiftedMid), used: true, note: sourceParts.join(" • ") || "Historical market calibration" };
}

export function appraiseItem(item: AppraisalInput): ItemAppraisal {
  const prices = uniqueSorted([item.estimatedValueCents, item.realPriceCents, item.steamPriceCents]);
  const historical = historicalBase(prices, item.historyCalibration, item.phase);
  if (!prices.length && historical.midpoint === null) {
    return {
      baseLowCents: null,
      baseHighCents: null,
      lowCents: null,
      highCents: null,
      midpointCents: null,
      sourceCount: 0,
      confidence: "unavailable",
      floatQualityPercent: floatQuality(item.floatValue, item.exterior) === null ? null : floatQuality(item.floatValue, item.exterior)! * 100,
      blueCoveragePercent: blueGemAdjustment(item.blueGem).coverage,
      adjustments: [],
      historyUsed: false,
      historyNote: null,
      historicalMidpointCents: null,
    };
  }

  const baseLow = historical.low ?? prices[0];
  const baseHigh = historical.high ?? prices[prices.length - 1];
  const quality = floatQuality(item.floatValue, item.exterior);
  const blue = blueGemAdjustment(item.blueGem);
  const adjustments = [
    floatAdjustment(quality),
    blue.adjustment,
    fadeAdjustment(item.fade),
    item.historyCalibration?.phase ? null : phaseAdjustment(item.phase),
  ].filter((row): row is AppraisalAdjustment => row !== null);

  const lowPremium = adjustments.reduce((sum, row) => sum + row.lowPercent, 0) / 100;
  const highPremium = adjustments.reduce((sum, row) => sum + row.highPercent, 0) / 100;
  const low = Math.round(baseLow * (1 + lowPremium));
  const high = Math.max(low, Math.round(baseHigh * (1 + highPremium)));

  let confidence: AppraisalConfidence = prices.length >= 2 ? "high" : "medium";
  if (historical.used) {
    const sales = item.historyCalibration?.sales;
    const markets = item.historyCalibration?.markets;
    if ((sales?.observations ?? 0) >= 20 && (markets?.marketCount ?? 0) >= 3) confidence = "high";
    else confidence = "medium";
    if ((sales?.volatilityPercent ?? 0) > 18) confidence = "medium";
  }
  const sourceSpread = baseLow > 0 ? (baseHigh - baseLow) / baseLow : 0;
  if (sourceSpread > 0.25 && confidence === "high") confidence = "medium";
  if (blue.adjustment) confidence = "low";
  else if (adjustments.some((row) => row.key === "phase" && row.highPercent >= 20)) confidence = "low";
  else if ((quality ?? 0) >= 0.999 && confidence === "high") confidence = "medium";
  else if (adjustments.some((row) => row.key === "fade") && confidence === "high") confidence = "medium";

  return {
    baseLowCents: baseLow,
    baseHighCents: baseHigh,
    lowCents: low,
    highCents: high,
    midpointCents: Math.round((low + high) / 2),
    sourceCount: prices.length,
    confidence,
    floatQualityPercent: quality === null ? null : quality * 100,
    blueCoveragePercent: blue.coverage,
    adjustments,
    historyUsed: historical.used,
    historyNote: historical.note,
    historicalMidpointCents: historical.midpoint,
  };
}

export function appraisalMidpoint(item: AppraisalInput) {
  return appraiseItem(item).midpointCents;
}

export function sumAppraisals(items: AppraisalInput[]): AppraisalTotal {
  let low = 0;
  let high = 0;
  let midpoint = 0;
  let pricedItems = 0;
  for (const item of items) {
    const appraisal = appraiseItem(item);
    if (appraisal.lowCents === null || appraisal.highCents === null || appraisal.midpointCents === null) continue;
    low += appraisal.lowCents;
    high += appraisal.highCents;
    midpoint += appraisal.midpointCents;
    pricedItems += 1;
  }
  return { lowCents: low, highCents: high, midpointCents: midpoint, pricedItems, totalItems: items.length };
}

export function appraisalRangesOverlap(a: AppraisalTotal, b: AppraisalTotal) {
  if (!a.pricedItems || !b.pricedItems) return false;
  return a.lowCents <= b.highCents && b.lowCents <= a.highCents;
}
