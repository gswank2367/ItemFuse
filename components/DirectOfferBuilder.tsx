"use client";

import { useMemo, useState } from "react";
import type { ItemDisplayData } from "@/lib/item-display";
import { appraiseItem, sumAppraisals } from "@/lib/appraisal";

type Props = {
  otherSteamId: string;
  otherDisplayName: string;
  ownItems: ItemDisplayData[];
  friendItems: ItemDisplayData[];
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

function FilteredPicker({
  title,
  eyebrow,
  items,
  selected,
  onToggle,
}: {
  title: string;
  eyebrow: string;
  items: ItemDisplayData[];
  selected: Set<number>;
  onToggle: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => item.tradable !== false && (!q || `${item.name} ${item.subtitle ?? ""}`.toLowerCase().includes(q)))
      .sort((a, b) => (value(b) ?? -1) - (value(a) ?? -1));
  }, [items, query]);

  return (
    <section className="offer-selector-panel">
      <div className="offer-panel-head">
        <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inventory…" />
      </div>
      <div className="offer-item-picker-grid">
        {filtered.map((item) => {
          const id = Number(item.id);
          const active = selected.has(id);
          return (
            <button className={`offer-pick-card${active ? " selected" : ""}`} type="button" key={item.id} onClick={() => onToggle(id)}>
              <span className="offer-pick-check">{active ? "✓" : "+"}</span>
              <span className="offer-pick-image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}</span>
              <span className="offer-pick-copy"><b>{item.name}</b><small>{item.subtitle ?? "CS2 item"}</small><strong>{money(value(item))}</strong></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function DirectOfferBuilder({ otherSteamId, otherDisplayName, ownItems, friendItems }: Props) {
  const [ownSelected, setOwnSelected] = useState<Set<number>>(new Set());
  const [friendSelected, setFriendSelected] = useState<Set<number>>(new Set());
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const yourItems = useMemo(() => ownItems.filter((item) => ownSelected.has(Number(item.id))), [ownItems, ownSelected]);
  const requestedItems = useMemo(() => friendItems.filter((item) => friendSelected.has(Number(item.id))), [friendItems, friendSelected]);
  const yourTotal = sum(yourItems);
  const theirTotal = sum(requestedItems);
  const yourRange = range(yourItems);
  const theirRange = range(requestedItems);
  const delta = yourTotal && theirTotal ? Math.abs(yourTotal - theirTotal) / Math.max(yourTotal, theirTotal) * 100 : null;

  function toggle(setter: typeof setOwnSelected, id: number) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit() {
    setError("");
    if (!ownSelected.size || !friendSelected.size) {
      setError("Choose at least one item from each inventory.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/offers/direct", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          otherSteamId,
          initiatorItemIds: [...ownSelected],
          otherItemIds: [...friendSelected],
          note,
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
        <div><span className="eyebrow">YOUR SIDE</span><strong>{ownSelected.size} item{ownSelected.size === 1 ? "" : "s"}</strong><small>{moneyRange(yourRange)}</small></div>
        <div className="offer-balance"><span>⇄</span><b>{delta === null ? "Select items to compare value" : `${delta.toFixed(1)}% estimated difference`}</b></div>
        <div><span className="eyebrow">YOU REQUEST FROM {otherDisplayName.toUpperCase()}</span><strong>{friendSelected.size} item{friendSelected.size === 1 ? "" : "s"}</strong><small>{moneyRange(theirRange)}</small></div>
      </section>

      <div className="offer-builder-columns">
        <FilteredPicker title="What will you give?" eyebrow="YOUR INVENTORY" items={ownItems} selected={ownSelected} onToggle={(id) => toggle(setOwnSelected, id)} />
        <FilteredPicker title={`What do you want from ${otherDisplayName}?`} eyebrow="FRIEND INVENTORY" items={friendItems} selected={friendSelected} onToggle={(id) => toggle(setFriendSelected, id)} />
      </div>

      <section className="offer-request-panel">
        <label className="offer-note-field"><span>Message with offer</span><textarea maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note about float, stickers, adds, etc." /></label>
        <div className="offer-safety-mini"><b>This is an ItemFuse negotiation, not a Steam trade yet.</b><span>Your friend must accept here first. The final item exchange still happens on Steam, where both sides can verify every item again.</span></div>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button primary offer-submit" type="button" disabled={sending || !ownSelected.size || !friendSelected.size} onClick={submit}>{sending ? "Sending offer…" : "Send direct offer"}</button>
      </section>
    </div>
  );
}
