import Image from "next/image";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import ListingForm from "@/components/ListingForm";
import { getInventoryItem, getKnownMarketNames, getUserBySteamId } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { appraiseItem } from "@/lib/appraisal";

export const dynamic = "force-dynamic";

function money(cents: number | null) {
  if (cents === null) return "No estimate";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function moneyRange(low: number | null, high: number | null) {
  if (low === null || high === null) return "No appraisal";
  if (Math.abs(low - high) < 1) return money(low);
  return `${money(low)} – ${money(high)}`;
}

export default async function NewTradePage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) return <main className="shell"><p>ItemFuse profile not found.</p></main>;
  const params = await searchParams;
  const itemId = Number(params.item);
  const item = Number.isInteger(itemId) ? await getInventoryItem(user.id, itemId) : null;
  const knownMarketNames = await getKnownMarketNames();
  const appraisal = item ? appraiseItem({
    name: item.market_hash_name ?? item.name,
    exterior: item.exterior,
    floatValue: item.float_value,
    phase: item.phase,
    fade: item.fade,
    blueGem: item.blue_gem,
    estimatedValueCents: item.estimated_value_cents,
    steamPriceCents: item.steam_price_cents,
    realPriceCents: item.real_price_cents,
  }) : null;

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
      <AppNav active="trades" />
      <section className="section-head"><div><span className="eyebrow">CREATE A TRADE</span><h1>Open an item to offers</h1><p>Tell ItemFuse what you have and what you want back. Reciprocal listings become matches automatically.</p></div></section>

      {!item ? (
        <section className="empty-state"><h3>Choose an item first</h3><p>Go back to your inventory and tap <b>Open to Offers</b> on a tradable item.</p><Link className="button primary inline-button" href="/">Back to inventory</Link></section>
      ) : (
        <div className="trade-builder">
          <section className="selected-item-card">
            <div className="selected-image">{item.icon_url ? <Image src={item.icon_url} alt={item.market_hash_name ?? item.name} fill sizes="320px" /> : null}</div>
            <span className="eyebrow">YOU'RE OFFERING</span>
            <h2>{item.market_hash_name ?? item.name}</h2>
            <p>{[item.weapon, item.exterior].filter(Boolean).join(" • ")}</p>
            <div className="selected-meta"><span>ItemFuse appraisal <b>{appraisal ? moneyRange(appraisal.lowCents, appraisal.highCents) : "—"}</b></span>{item.float_value !== null ? <span>Float <b>{item.float_value.toFixed(8)}</b></span> : null}</div>
          </section>
          <section className="builder-form-card"><ListingForm itemId={item.id} knownMarketNames={knownMarketNames} /></section>
        </div>
      )}
    </main>
  );
}
