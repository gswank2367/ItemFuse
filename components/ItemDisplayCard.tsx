"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import InspectButton from "@/components/InspectButton";
import type { DisplayCosmetic, ItemDisplayData } from "@/lib/item-display";
import { getItemRarityTheme, rarityStyle } from "@/lib/item-rarity-theme";
import rarityStyles from "@/components/ItemRarityTheme.module.css";
import appraisalStyles from "@/components/Appraisal.module.css";
import { appraiseItem, type HistoricalCalibration } from "@/lib/appraisal";

export type ItemCardAction = {
  label: string;
  href: string;
  external?: boolean;
  kind?: "primary" | "secondary";
};

type Props = {
  item: ItemDisplayData;
  eyebrow?: string;
  actions?: ItemCardAction[];
  showInspect?: boolean;
  compact?: boolean;
};

function money(cents: number | null) {
  if (cents === null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function moneyRange(low: number | null, high: number | null) {
  if (low === null || high === null) return "—";
  if (Math.abs(low - high) < 1) return money(low) ?? "—";
  const compact = (value: number) => value >= 10000 ? `$${(value / 100).toFixed(0)}` : `$${(value / 100).toFixed(value < 100 ? 2 : 1)}`;
  return `${compact(low)}–${compact(high)}`;
}

function confidenceLabel(value: string) {
  return value === "high" ? "High confidence" : value === "medium" ? "Medium confidence" : value === "low" ? "Low confidence" : "No appraisal";
}

function formatFloat(value: number | null) {
  if (value === null) return null;
  return value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

function CosmeticIcon({ cosmetic, stickerReference = false }: { cosmetic: DisplayCosmetic; stickerReference?: boolean }) {
  const [priceCents, setPriceCents] = useState<number | null>(cosmetic.priceCents);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "done">(cosmetic.priceCents !== null ? "done" : "idle");

  async function loadReferencePrice() {
    if (!stickerReference || priceCents !== null || lookupState !== "idle") return;
    setLookupState("loading");
    try {
      const response = await fetch(`/api/catalog/sticker-price?name=${encodeURIComponent(cosmetic.name)}`, {
        credentials: "include",
      });
      if (response.ok) {
        const payload = (await response.json()) as { priceCents?: number | null };
        if (typeof payload.priceCents === "number" && Number.isFinite(payload.priceCents)) {
          setPriceCents(payload.priceCents);
        }
      }
    } catch {
      // Keep the reference price unavailable when the provider lookup fails.
    } finally {
      setLookupState("done");
    }
  }

  const priceText = priceCents !== null
    ? (stickerReference ? `Unapplied: ${money(priceCents)}` : `Est. ${money(priceCents)}`)
    : lookupState === "loading"
      ? "Loading market price…"
      : stickerReference
        ? "Unapplied market price unavailable"
        : "Price unavailable";

  return (
    <button
      className="priced-cosmetic"
      type="button"
      onMouseEnter={loadReferencePrice}
      onFocus={loadReferencePrice}
      onTouchStart={loadReferencePrice}
      aria-label={`${cosmetic.name}${cosmetic.wear !== null ? `, ${Math.round(cosmetic.wear * 100)}% scraped` : ""}, ${priceText}`}
    >
      {cosmetic.imageUrl ? <img src={cosmetic.imageUrl} alt={cosmetic.name} /> : <span className="cosmetic-placeholder">?</span>}
      <span className="cosmetic-tooltip" role="tooltip">
        <b>{cosmetic.name}</b>
        {cosmetic.wear !== null ? <small>{Math.round(cosmetic.wear * 100)}% scraped</small> : null}
        <strong>{priceText}</strong>
        {stickerReference && priceCents !== null ? <small>Reference price for the separate, unapplied sticker</small> : null}
      </span>
    </button>
  );
}

function CosmeticStrip({
  label,
  cosmetics,
  limit,
  stickerReference = false,
  reserveSpace = false,
}: {
  label: string;
  cosmetics: DisplayCosmetic[];
  limit?: number;
  stickerReference?: boolean;
  reserveSpace?: boolean;
}) {
  if (!cosmetics.length && !reserveSpace) return null;
  const shown = limit ? cosmetics.slice(0, limit) : cosmetics;
  const empty = cosmetics.length === 0;

  return (
    <div className={`uniform-cosmetics${empty ? " uniform-cosmetics-empty" : ""}`}>
      <span className="uniform-cosmetics-label">{label}</span>
      <div className="uniform-cosmetic-icons">
        {empty ? (
          <span className="cosmetic-empty-text">—</span>
        ) : (
          <>
            {shown.map((cosmetic, index) => (
              <CosmeticIcon cosmetic={cosmetic} stickerReference={stickerReference} key={`${cosmetic.name}-${index}`} />
            ))}
            {limit && cosmetics.length > limit ? <span className="cosmetic-more">+{cosmetics.length - limit}</span> : null}
          </>
        )}
      </div>
    </div>
  );
}

function ActionLinks({ actions }: { actions: ItemCardAction[] }) {
  if (!actions.length) return null;
  return (
    <div className="uniform-item-actions">
      {actions.map((action, index) => action.external ? (
        <a key={`${action.href}-${index}`} className={`uniform-action ${action.kind ?? "secondary"}`} href={action.href} target="_blank" rel="noreferrer">{action.label}</a>
      ) : (
        <Link key={`${action.href}-${index}`} className={`uniform-action ${action.kind ?? "secondary"}`} href={action.href}>{action.label}</Link>
      ))}
    </div>
  );
}

export default function ItemDisplayCard({ item, eyebrow, actions = [], showInspect = false, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [historyCalibration, setHistoryCalibration] = useState<HistoricalCalibration | null>(item.historyCalibration ?? null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const appraisal = appraiseItem({ ...item, historyCalibration });
  const rarityTheme = getItemRarityTheme(item.rarity, item.itemType);
  const themeStyle = rarityStyle(rarityTheme);
  const confidenceClass = appraisal.confidence === "high" ? appraisalStyles.confidenceHigh
    : appraisal.confidence === "medium" ? appraisalStyles.confidenceMedium
    : appraisal.confidence === "low" ? appraisalStyles.confidenceLow
    : appraisalStyles.confidenceUnavailable;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || historyCalibration || historyLoading || !item.name) return;
    let cancelled = false;
    const params = new URLSearchParams({ name: item.name });
    if (item.phase) params.set("phase", item.phase);
    if (item.dbItemId !== null) params.set("itemId", String(item.dbItemId));

    setHistoryLoading(true);
    fetch(`/api/appraisal/history?${params.toString()}`, { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("History unavailable");
        return response.json() as Promise<{ calibration?: HistoricalCalibration }>;
      })
      .then((payload) => {
        if (!cancelled && payload.calibration) setHistoryCalibration(payload.calibration);
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryCalibration({ available: false, reason: "request-failed", source: "steamdataapi", days: 90, asOf: null, sales: null, markets: null, phase: null });
        }
      })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });

    return () => { cancelled = true; };
  }, [open, historyCalibration, historyLoading, item.name, item.phase, item.dbItemId]);

  function openFromCard(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a,button,input,select,textarea,form")) return;
    setOpen(true);
  }

  return (
    <>
      <article
        className={`${rarityStyles.rarityCard} uniform-item-card${compact ? " compact" : ""}`}
        style={themeStyle}
        onClick={openFromCard}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            const target = event.target as HTMLElement;
            if (!target.closest("a,button,input,select,textarea,form")) {
              event.preventDefault();
              setOpen(true);
            }
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${item.name}`}
      >
        <div className="uniform-item-image">
          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className="no-image">No image</div>}
          {item.tradable !== null ? <span className={`trade-pill ${item.tradable ? "yes" : "no"}`}>{item.tradable ? "Tradable" : "Not tradable"}</span> : null}
          {item.enriched ? <span className="enriched-pill">Exact data</span> : null}
          {item.rarity ? <span className={rarityStyles.rarityBadge}>{rarityTheme.label}</span> : null}
        </div>
        <div className="uniform-item-body">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h3 title={item.name}>{item.name}</h3>
          <p className="uniform-subtitle">{item.subtitle || "CS2 Item"}</p>

          <div className="uniform-summary-stats">
            <span className={`${appraisalStyles.summaryStat} appraisal-summary-stat`}><b>Appraisal</b>{moneyRange(appraisal.lowCents, appraisal.highCents)}</span>
            <span><b>Float</b>{item.floatValue !== null ? formatFloat(item.floatValue) : "—"}</span>
            <span><b>Seed</b>{item.paintSeed ?? "—"}</span>
          </div>

          <CosmeticStrip label="STICKERS" cosmetics={item.stickers} limit={5} stickerReference reserveSpace />

          <div className="uniform-item-spacer" />
          <div className="uniform-item-footer">
            <button className="view-details-button" type="button" onClick={() => setOpen(true)}>View details</button>
            {showInspect && item.inspectLink ? <InspectButton inspectLink={item.inspectLink} /> : null}
            <ActionLinks actions={actions} />
          </div>
        </div>
      </article>

      {open ? (
        <div className="item-modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
          <section className={`${rarityStyles.rarityModal} item-modal`} style={themeStyle} role="dialog" aria-modal="true" aria-label={`${item.name} details`}>
            <header className="item-modal-header">
              <div><span className="eyebrow">ITEM DETAILS</span><h2>{item.name}</h2><p>{item.subtitle || item.itemType || "CS2 Item"}</p>{item.rarity ? <span className={rarityStyles.modalRarityLine}>{rarityTheme.label}</span> : null}</div>
              <button type="button" className="item-modal-close" onClick={() => setOpen(false)} aria-label="Close details">×</button>
            </header>

            <div className="item-modal-grid">
              <div className="item-modal-image">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className="no-image">No image</div>}</div>
              <div className="item-modal-details">
                <div className="detail-price-grid">
                  <span className="itemfuse-appraisal-price"><b>ItemFuse appraisal</b>{moneyRange(appraisal.lowCents, appraisal.highCents)}</span>
                  <span><b>Base market range</b>{moneyRange(appraisal.baseLowCents, appraisal.baseHighCents)}</span>
                  <span><b>Steam</b>{money(item.steamPriceCents) ?? "—"}</span>
                </div>
                <div className="detail-property-grid">
                  <span><b>Float</b>{formatFloat(item.floatValue) ?? "—"}</span>
                  <span><b>Paint seed</b>{item.paintSeed ?? "—"}</span>
                  <span><b>Paint index</b>{item.paintIndex ?? "—"}</span>
                  <span><b>Phase</b>{item.phase ?? "—"}</span>
                  <span><b>Fade</b>{item.fade !== null ? `${item.fade.toFixed(2)}%` : "—"}</span>
                  <span><b>Exterior</b>{item.exterior ?? "—"}</span>
                  <span><b>Rarity</b>{item.rarity ?? "—"}</span>
                  <span><b>Marketable</b>{item.marketable === null ? "—" : item.marketable ? "Yes" : "No"}</span>
                </div>
                {item.blueGem ? <div className="detail-pattern-box"><b>{item.blueGem.tier ?? "Pattern data"}</b>{item.blueGem.rank !== null ? <span>Rank #{item.blueGem.rank}{item.blueGem.totalRanked ? ` / ${item.blueGem.totalRanked}` : ""}</span> : null}{item.blueGem.playsideBlue !== null ? <span>Playside blue: {item.blueGem.playsideBlue.toFixed(1)}%</span> : null}{item.blueGem.backsideBlue !== null ? <span>Backside blue: {item.blueGem.backsideBlue.toFixed(1)}%</span> : null}</div> : null}
                <div className={`${appraisalStyles.breakdown} ${confidenceClass}`}>
                  <div className={appraisalStyles.head}><span><b>ITEMFUSE APPRAISAL</b><strong>{moneyRange(appraisal.lowCents, appraisal.highCents)}</strong></span><em>{confidenceLabel(appraisal.confidence)}</em></div>
                  {historyLoading ? <p><b>Historical calibration</b><span>Loading 90-day market history…</span></p> : null}
                  {appraisal.historyUsed ? <p><b>Historical calibration</b><span>{appraisal.historyNote ?? "90-day market history applied"}</span></p> : null}
                  {!historyLoading && historyCalibration && !historyCalibration.available ? <p><b>Historical calibration</b><span>Unavailable on the current data plan; using live-market appraisal.</span></p> : null}
                  {historyCalibration?.sales?.median30Cents ? <p><b>30-day Steam median</b><span>{money(historyCalibration.sales.median30Cents)} • {historyCalibration.sales.sold90d.toLocaleString()} sales volume reported over 90d</span></p> : null}
                  {historyCalibration?.phase?.median30Cents ? <p><b>{historyCalibration.phase.phase} history</b><span>{money(historyCalibration.phase.median30Cents)} 30-day median across tracked markets</span></p> : null}
                  {appraisal.floatQualityPercent !== null ? <p><b>Float quality</b><span>{appraisal.floatQualityPercent.toFixed(1)}% within its wear band</span></p> : null}
                  {appraisal.adjustments.length ? appraisal.adjustments.map((adjustment) => <p key={adjustment.key}><b>{adjustment.label}</b><span>{adjustment.detail} • +{adjustment.lowPercent}% to +{adjustment.highPercent}% model range</span></p>) : <p><b>Market-priced item</b><span>No specimen-specific premium detected by the current model.</span></p>}
                  <small>Historical data calibrates the market baseline and volatility. Float and Blue Gem premiums remain conservative model estimates until ItemFuse has licensed exact-specimen sale comps.</small>
                </div>
              </div>
            </div>

            <div className="item-modal-cosmetics">
              <CosmeticStrip label="STICKERS — HOVER OR TAP FOR MARKET PRICE" cosmetics={item.stickers} stickerReference />
              <CosmeticStrip label="CHARMS" cosmetics={item.charms} />
              <CosmeticStrip label="PATCHES" cosmetics={item.patches} />
            </div>

            <footer className="item-modal-footer">
              {showInspect && item.inspectLink ? <InspectButton inspectLink={item.inspectLink} /> : null}
              <ActionLinks actions={actions} />
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
