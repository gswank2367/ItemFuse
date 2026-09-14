"use client";

import { useMemo, useState } from "react";
import type { ItemDisplayData } from "@/lib/item-display";
import { appraiseItem, sumAppraisals } from "@/lib/appraisal";

type Props = {
  listingId: number;
  otherUserId: number;
  otherDisplayName: string;
  ownItems: ItemDisplayData[];
  requestedItems: ItemDisplayData[];
  preselectedOwnItemIds?: number[];
  parentOfferId?: number | null;
};

function value(item: ItemDisplayData) {
  return appraiseItem(item).midpointCents;
}

function money(cents: number | null) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function sum(items: ItemDisplayData[]) {
  const total = sumAppraisals(items);
  return total.pricedItems ? total.midpointCents : null;
}

function range(items: ItemDisplayData[]) {
  const total = sumAppraisals(items);
  return total.pricedItems ? total : null;
}

function moneyRange(total: ReturnType<typeof sumAppraisals> | null) {
  if (!total || !total.pricedItems) return "—";
  if (Math.abs(total.lowCents - total.highCents) < 1) return money(total.lowCents);
  return `${money(total.lowCents)} – ${money(total.highCents)}`;
}

export default function OfferBuilder({
  listingId,
  otherUserId,
  otherDisplayName,
  ownItems,
  requestedItems,
  preselectedOwnItemIds = [],
  parentOfferId = null,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(preselectedOwnItemIds));
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = ownItems.filter((item) => item.tradable !== false && (!q || `${item.name} ${item.subtitle ?? ""}`.toLowerCase().includes(q)));
    return rows.sort((a, b) => (value(b) ?? -1) - (value(a) ?? -1));
  }, [ownItems, query]);

  const selectedItems = useMemo(() => ownItems.filter((item) => selected.has(Number(item.id))), [ownItems, selected]);
  const yourTotal = sum(selectedItems);
  const theirTotal = sum(requestedItems);
  const yourRange = range(selectedItems);
  const theirRange = range(requestedItems);
  const delta = yourTotal && theirTotal ? Math.abs(yourTotal - theirTotal) / Math.max(yourTotal, theirTotal) * 100 : null;

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit() {
    setError("");
    if (!selected.size) {
      setError("Choose at least one item from your inventory.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId,
          otherUserId,
          initiatorItemIds: [...selected],
          otherItemIds: requestedItems.map((item) => Number(item.id)),
          note,
          parentOfferId,
        }),
      });
      const payload = await response.json() as { offerId?: number; error?: string };
      if (!response.ok || !payload.offerId) throw new Error(payload.error || "Could not send offer.");
      window.location.href = `/offers/${payload.offerId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send offer.");
      setSending(false);
    }
  }

  return (
    <div className="offer-builder-shell">
      <section className="offer-builder-summary">
        <div>
          <span className="eyebrow">YOUR SIDE</span>
          <strong>{selected.size} item{selected.size === 1 ? "" : "s"}</strong>
          <small>{moneyRange(yourRange)}</small>
        </div>
        <div className="offer-balance">
          <span>⇄</span>
          <b>{delta === null ? "Value comparison unavailable" : `${delta.toFixed(1)}% estimated difference`}</b>
        </div>
        <div>
          <span className="eyebrow">YOU RECEIVE FROM {otherDisplayName.toUpperCase()}</span>
          <strong>{requestedItems.length} item{requestedItems.length === 1 ? "" : "s"}</strong>
          <small>{moneyRange(theirRange)}</small>
        </div>
      </section>

      <div className="offer-builder-columns">
        <section className="offer-selector-panel">
          <div className="offer-panel-head">
            <div><span className="eyebrow">CHOOSE YOUR ITEMS</span><h2>What will you give?</h2></div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your inventory…" />
          </div>
          <div className="offer-item-picker-grid">
            {filtered.map((item) => {
              const id = Number(item.id);
              const active = selected.has(id);
              return (
                <button className={`offer-pick-card${active ? " selected" : ""}`} type="button" key={item.id} onClick={() => toggle(id)}>
                  <span className="offer-pick-check">{active ? "✓" : "+"}</span>
                  <span className="offer-pick-image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}</span>
                  <span className="offer-pick-copy"><b>{item.name}</b><small>{item.subtitle ?? "CS2 item"}</small><strong>{money(value(item))}</strong></span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="offer-request-panel">
          <div className="offer-panel-head"><div><span className="eyebrow">REQUESTED SIDE</span><h2>What you receive</h2></div></div>
          <div className="offer-request-list">
            {requestedItems.map((item) => (
              <div className="offer-request-item" key={item.id}>
                <div>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}</div>
                <span><b>{item.name}</b><small>{item.subtitle ?? "CS2 item"}</small><strong>{money(value(item))}</strong></span>
              </div>
            ))}
          </div>
          <label className="offer-note-field"><span>Message with offer</span><textarea maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note about float, stickers, adds, etc." /></label>
          <div className="offer-safety-mini"><b>Steam completes the final trade.</b><span>ItemFuse never asks for your Steam password, Steam Guard code, or custody of your items.</span></div>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button primary offer-submit" type="button" disabled={sending || !selected.size} onClick={submit}>{sending ? "Sending offer…" : parentOfferId ? "Send counteroffer" : "Send trade offer"}</button>
        </section>
      </div>
    </div>
  );
}
