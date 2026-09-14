"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CatalogItemPicker from "@/components/CatalogItemPicker";

export default function WishlistForm({ defaultItem = "" }: { knownMarketNames?: string[]; defaultItem?: string }) {
  const router = useRouter();
  const [item, setItem] = useState(defaultItem);
  const [exterior, setExterior] = useState("");
  const [phase, setPhase] = useState("");
  const [maxFloat, setMaxFloat] = useState("");
  const [tolerance, setTolerance] = useState("10");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/wishlist", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketHashName: item.trim(), exterior: exterior || null, phase: phase.trim() || null, maxFloat: maxFloat.trim() ? Number(maxFloat) : null, tolerancePercent: Number(tolerance), notes: notes.trim() || null })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add wishlist item.");
      setItem(""); setExterior(""); setPhase(""); setMaxFloat(""); setNotes(""); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not add wishlist item."); }
    finally { setSaving(false); }
  }

  return (
    <form className="listing-form wishlist-form" onSubmit={submit}>
      <label><span>Item you want</span><CatalogItemPicker value={item} onChange={setItem} placeholder="Search Karambit, Doppler, Vice…" /><small>Search results include the actual CS2 item artwork and current estimated price.</small></label>
      <div className="form-row"><label><span>Preferred exterior</span><select value={exterior} onChange={(e)=>setExterior(e.target.value)}><option value="">Any exterior</option><option>Factory New</option><option>Minimal Wear</option><option>Field-Tested</option><option>Well-Worn</option><option>Battle-Scarred</option></select></label><label><span>Value tolerance</span><select value={tolerance} onChange={(e)=>setTolerance(e.target.value)}><option value="2">±2%</option><option value="5">±5%</option><option value="10">±10%</option><option value="15">±15%</option><option value="25">±25%</option><option value="50">±50%</option></select></label></div>
      <div className="form-row"><label><span>Phase / pattern</span><input value={phase} onChange={(e)=>setPhase(e.target.value)} placeholder="Phase 2, Ruby, etc." /></label><label><span>Maximum float</span><input inputMode="decimal" value={maxFloat} onChange={(e)=>setMaxFloat(e.target.value)} placeholder="0.03" /></label></div>
      <label><span>Notes</span><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} placeholder="P2 preferred, clean corner, open to adds, etc." /></label>
      <button className="button primary" type="submit" disabled={saving}>{saving ? "Adding…" : "Add to Wishlist"}</button>{error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
