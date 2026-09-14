import Link from "next/link";
import AppNav from "@/components/AppNav";
import TradeUrlForm from "@/components/TradeUrlForm";
import ItemDisplayCard from "@/components/ItemDisplayCard";
import SteamAvatar from "@/components/SteamAvatar";
import { getListingsForUser, getOffersForUser, getUserBySteamId, type TradeOffer } from "@/lib/db";
import { getCatalogItemsByNames } from "@/lib/catalog";
import { catalogItemToDisplay, dbItemToDisplay } from "@/lib/item-display";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

function offerOther(offer: TradeOffer, userId: number) {
  return offer.userA.id === userId ? offer.userB : offer.userA;
}

function OfferSummary({ offer, userId }: { offer: TradeOffer; userId: number }) {
  const other = offerOther(offer, userId);
  const yours = offer.itemsByUser[userId] ?? [];
  const theirs = offer.itemsByUser[other.id] ?? [];
  const incoming = offer.initiatorUserId !== userId;
  return <Link className={`offer-summary-card status-${offer.status}`} href={`/offers/${offer.id}`}>
    <div className="offer-summary-user"><SteamAvatar src={other.avatar_url} name={other.display_name} size={42} /><span><small>{incoming ? "From" : "To"}</small><b>{other.display_name}</b></span></div>
    <div className="offer-summary-items"><span><b>{yours.length}</b><small>you give</small></span><i>⇄</i><span><b>{theirs.length}</b><small>you get</small></span></div>
    <div className="offer-summary-status"><small>{incoming ? "Incoming" : "Outgoing"}</small><b>{offer.status}</b></div>
    <span className="offer-summary-arrow">›</span>
  </Link>;
}

export default async function TradesPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) return <main className="shell"><p>ItemFuse profile not found.</p></main>;
  const [listings, offers] = await Promise.all([getListingsForUser(user.id), getOffersForUser(user.id)]);
  const params = await searchParams;
  const wantedNames = listings.map((listing) => listing.wanted.marketHashName).filter((name) => name !== "*");
  const wantedCatalog = await getCatalogItemsByNames(wantedNames);
  const pendingIncoming = offers.filter((offer) => offer.status === "pending" && offer.initiatorUserId !== user.id);
  const pendingOutgoing = offers.filter((offer) => offer.status === "pending" && offer.initiatorUserId === user.id);
  const recent = offers.filter((offer) => offer.status !== "pending").slice(0, 12);

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
      <AppNav active="trades" />
      <section className="section-head"><div><span className="eyebrow">TRADE CENTER</span><h1>Offers & listings</h1><p>Negotiate structured item-for-item offers inside ItemFuse, then hand the final accepted trade to Steam.</p></div><Link className="button primary inline-button" href="/">Choose another item</Link></section>
      {params.created ? <div className="success-banner">Listing published. ItemFuse is now looking for the opposite side of this trade.</div> : null}
      <TradeUrlForm initialValue={user.trade_url} />

      <section className="offer-dashboard-grid">
        <div className="offer-dashboard-section"><div className="offer-dashboard-head"><div><span className="eyebrow">INCOMING</span><h2>Offers waiting on you</h2></div><b>{pendingIncoming.length}</b></div>{pendingIncoming.length ? pendingIncoming.map((offer) => <OfferSummary key={offer.id} offer={offer} userId={user.id} />) : <div className="mini-empty">No incoming offers right now.</div>}</div>
        <div className="offer-dashboard-section"><div className="offer-dashboard-head"><div><span className="eyebrow">OUTGOING</span><h2>Your pending offers</h2></div><b>{pendingOutgoing.length}</b></div>{pendingOutgoing.length ? pendingOutgoing.map((offer) => <OfferSummary key={offer.id} offer={offer} userId={user.id} />) : <div className="mini-empty">You have no pending offers.</div>}</div>
      </section>

      {recent.length ? <section className="recent-offers"><div className="subsection-title"><span className="eyebrow">RECENT ACTIVITY</span><h2>Offer history</h2></div>{recent.map((offer) => <OfferSummary key={offer.id} offer={offer} userId={user.id} />)}</section> : null}

      <div className="subsection-title active-listing-title"><span className="eyebrow">YOUR LISTINGS</span><h2>Open to Offers</h2><p>Active items and what you are looking for in return.</p></div>
      {listings.length === 0 ? <section className="empty-state"><h3>No active listings yet</h3><p>Open a tradable inventory item to offers and specify what you want back.</p><Link className="button primary inline-button" href="/">Browse your inventory</Link></section> : (
        <section className="trade-uniform-list">
          {listings.map((listing) => {
            const wanted = listing.wanted.marketHashName === "*" ? null : wantedCatalog.get(listing.wanted.marketHashName);
            const wantedSubtitle = `${listing.wanted.exterior ?? "Any exterior"} • ±${listing.wanted.tolerancePercent}% value`;
            return <article className="trade-uniform-row" key={listing.id}>
              <ItemDisplayCard item={dbItemToDisplay(listing.offered)} eyebrow="YOU OFFER" showInspect compact />
              <div className="uniform-swap">⇄</div>
              <ItemDisplayCard item={catalogItemToDisplay({ id: `wanted-${listing.id}`, name: listing.wanted.marketHashName === "*" ? "Open to anything" : listing.wanted.marketHashName, imageUrl: wanted?.imageUrl, priceCents: wanted?.priceCents, subtitle: wantedSubtitle, exterior: listing.wanted.exterior })} eyebrow="YOU WANT" compact />
              <div className="trade-uniform-actions">
                {listing.notes ? <p>{listing.notes}</p> : null}
                <Link href="/matches" className="button match-button">View matches</Link>
                <form method="post" action="/api/listings/close"><input type="hidden" name="listingId" value={listing.id} /><button className="text-button" type="submit">Close listing</button></form>
              </div>
            </article>;
          })}
        </section>
      )}
    </main>
  );
}
