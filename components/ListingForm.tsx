"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CatalogItemPicker from "@/components/CatalogItemPicker";

export default function ListingForm({ itemId, defaultWanted = "" }: { itemId: number; defaultWanted?: string; knownMarketNames?: string[] }) {
  const router = useRouter();
  const [wanted, setWanted] = useState(defaultWanted);
  const [exterior, setExterior] = useState("");
  const [tolerance, setTolerance] = useState("5");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/listings", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ inventoryItemId: itemId, wantedMarketHashName: wanted.trim() || "*", wantedExterior: exterior || null, tolerancePercent: Number(tolerance), notes: notes.trim() || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create listing.");
      router.push("/trades?created=1"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create listing."); }
    finally { setSaving(false); }
  }

  return <form className="listing-form" onSubmit={submit}>
    <label><span>What do you want?</span><CatalogItemPicker value={wanted} onChange={setWanted} placeholder="Search for the item you want…" allowBlank /><small>Leave blank for “open to anything.” Search results show the real item artwork.</small></label>
    <div className="form-row"><label><span>Preferred exterior</span><select value={exterior} onChange={(e)=>setExterior(e.target.value)}><option value="">Any exterior</option><option>Factory New</option><option>Minimal Wear</option><option>Field-Tested</option><option>Well-Worn</option><option>Battle-Scarred</option></select></label><label><span>Value tolerance</span><select value={tolerance} onChange={(e)=>setTolerance(e.target.value)}><option value="2">±2%</option><option value="5">±5%</option><option value="10">±10%</option><option value="15">±15%</option><option value="25">±25%</option><option value="50">±50%</option></select></label></div>
    <label><span>Notes</span><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={4} placeholder="P2 preferred, open to small adds, etc." /></label>
    <button className="button primary" type="submit" disabled={saving}>{saving ? "Publishing…" : "Open to Offers"}</button>{error ? <p className="form-error">{error}</p> : null}
  </form>;
}
