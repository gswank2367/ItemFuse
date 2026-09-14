"use client";

import { useMemo, useState } from "react";
import ItemDisplayCard from "@/components/ItemDisplayCard";
import type { ItemDisplayData } from "@/lib/item-display";
import { appraiseItem, sumAppraisals } from "@/lib/appraisal";

type Mode = "own" | "friend";
type SortMode = "default" | "price-desc" | "price-asc" | "name-asc" | "name-desc" | "float-asc" | "tradable";

type Props = {
  items: ItemDisplayData[];
  mode: Mode;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function preferredValue(item: ItemDisplayData) {
  return appraiseItem(item).midpointCents;
}

function inventoryRange(items: ItemDisplayData[]) {
  const total = sumAppraisals(items);
  return { low: total.lowCents, high: total.highCents, priced: total.pricedItems };
}

export default function InventoryBrowser({ items, mode }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("default");
  const [tradableOnly, setTradableOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const totalRange = useMemo(() => inventoryRange(items), [items]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const minCents = minPrice.trim() === "" ? null : Number(minPrice) * 100;
    const maxCents = maxPrice.trim() === "" ? null : Number(maxPrice) * 100;

    const filtered = items.filter((item) => {
      if (normalized) {
        const haystack = [item.name, item.subtitle, item.weapon, item.exterior, item.rarity, item.itemType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }

      if (tradableOnly && item.tradable !== true) return false;

      const value = preferredValue(item);
      if (minCents !== null && Number.isFinite(minCents) && (value === null || value < minCents)) return false;
      if (maxCents !== null && Number.isFinite(maxCents) && (value === null || value > maxCents)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const aValue = preferredValue(a);
      const bValue = preferredValue(b);
      switch (sort) {
        case "price-desc":
          return (bValue ?? -1) - (aValue ?? -1);
        case "price-asc":
          return (aValue ?? Number.MAX_SAFE_INTEGER) - (bValue ?? Number.MAX_SAFE_INTEGER);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "float-asc":
          return (a.floatValue ?? Number.MAX_SAFE_INTEGER) - (b.floatValue ?? Number.MAX_SAFE_INTEGER);
        case "tradable":
          return Number(b.tradable === true) - Number(a.tradable === true);
        default:
          return 0;
      }
    });
  }, [items, query, sort, tradableOnly, minPrice, maxPrice]);

  const visibleRange = useMemo(() => inventoryRange(visible), [visible]);
  const filtered = visible.length !== items.length || query !== "" || tradableOnly || minPrice !== "" || maxPrice !== "" || sort !== "default";

  function reset() {
    setQuery("");
    setSort("default");
    setTradableOnly(false);
    setMinPrice("");
    setMaxPrice("");
  }

  return (
    <>
      <section className="inventory-browser-panel">
        <div className="inventory-value-block">
          <span className="eyebrow">ITEMFUSE APPRAISAL RANGE</span>
          <strong>{totalRange.priced ? `${money(totalRange.low)} – ${money(totalRange.high)}` : "Price data unavailable"}</strong>
          <small>{totalRange.priced}/{items.length} items have usable appraisal data</small>
        </div>

        <div className="inventory-filter-grid">
          <label className="inventory-search-field">
            <span>Search inventory</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="AK-47, Doppler, gloves…" />
          </label>
          <label>
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
              <option value="default">Default order</option>
              <option value="price-desc">Price: high to low</option>
              <option value="price-asc">Price: low to high</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="float-asc">Float: low to high</option>
              {mode === "own" ? <option value="tradable">Tradable first</option> : null}
            </select>
          </label>
          <label>
            <span>Min price</span>
            <div className="price-input-wrap"><i>$</i><input inputMode="decimal" type="number" min="0" step="1" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0" /></div>
          </label>
          <label>
            <span>Max price</span>
            <div className="price-input-wrap"><i>$</i><input inputMode="decimal" type="number" min="0" step="1" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Any" /></div>
          </label>
          {mode === "own" ? (
            <label className="tradable-filter">
              <input type="checkbox" checked={tradableOnly} onChange={(event) => setTradableOnly(event.target.checked)} />
              <span>Tradable only</span>
            </label>
          ) : <div aria-hidden="true" />}
          <button className="inventory-reset-button" type="button" onClick={reset}>Reset</button>
        </div>

        <div className="inventory-results-line">
          <span>Showing <b>{visible.length}</b> of <b>{items.length}</b> items</span>
          {filtered && visibleRange.priced ? <span>Visible value: <b>{money(visibleRange.low)} – {money(visibleRange.high)}</b></span> : null}
        </div>
      </section>

      {visible.length ? (
        <section className="inventory-grid uniform-grid">
          {visible.map((item) => (
            <ItemDisplayCard
              key={item.id}
              item={item}
              showInspect
              actions={mode === "own"
                ? (item.tradable ? [{ label: "Open to Offers", href: `/trades/new?item=${item.id}`, kind: "primary" as const }] : [])
                : [{ label: "Add to Wishlist", href: `/wishlist?item=${encodeURIComponent(item.name)}`, kind: "secondary" as const }]}
            />
          ))}
        </section>
      ) : (
        <section className="empty-state filtered-empty-state">
          <div className="empty-icon">⌕</div>
          <h3>No items match these filters</h3>
          <p>Try clearing the search, price range, or tradable-only filter.</p>
          <button type="button" className="inventory-reset-button standalone" onClick={reset}>Clear filters</button>
        </section>
      )}
    </>
  );
}
