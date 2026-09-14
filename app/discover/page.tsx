import SteamAvatar from "@/components/SteamAvatar";
import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import ItemDisplayCard from "@/components/ItemDisplayCard";
import LogoutButton from "@/components/LogoutButton";
import { getAllActiveListings, getInventory, getMatchesForUser, getUserBySteamId, getWishlistForUser } from "@/lib/db";
import { getCatalogItemsByNames } from "@/lib/catalog";
import { catalogItemToDisplay, dbItemToDisplay } from "@/lib/item-display";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function norm(value: string | null | undefined) { return (value ?? "").toLowerCase().trim(); }

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) redirect("/?reauth=1");
  const params = await searchParams;
  const [allListings, inventory, wishlist, matches] = await Promise.all([getAllActiveListings(), getInventory(user.id), getWishlistForUser(user.id), getMatchesForUser(user.id)]);
  const listings = allListings.filter((listing) => listing.userId !== user.id);
  const matchByListing = new Map<number, number>();
  for (const match of matches) matchByListing.set(match.theirListing.id, Math.max(matchByListing.get(match.theirListing.id) ?? 0, match.score));
  const ownedNames = new Set(inventory.filter((item) => item.tradable).map((item) => norm(item.market_hash_name ?? item.name)));
  const wishlistNames = new Set(wishlist.map((item) => norm(item.marketHashName)));
  const q = norm(params.q);
  const filter = params.filter ?? "all";

  let ranked = listings.map((listing) => {
    const offeredName = norm(listing.offered.market_hash_name ?? listing.offered.name);
    const wantedName = norm(listing.wanted.marketHashName);
    const onWishlist = wishlistNames.has(offeredName);
    const youOwnWanted = wantedName !== "*" && ownedNames.has(wantedName);
    const matchScore = matchByListing.get(listing.id) ?? null;
    const relevance = (matchScore ?? 0) + (onWishlist ? 35 : 0) + (youOwnWanted ? 25 : 0);
    return { listing, onWishlist, youOwnWanted, matchScore, relevance };
  });
  if (q) ranked = ranked.filter(({ listing }) => norm(`${listing.offered.market_hash_name ?? listing.offered.name} ${listing.wanted.marketHashName} ${listing.displayName}`).includes(q));
  if (filter === "wishlist") ranked = ranked.filter((row) => row.onWishlist);
  if (filter === "owned") ranked = ranked.filter((row) => row.youOwnWanted);
  if (filter === "matches") ranked = ranked.filter((row) => row.matchScore !== null);
  ranked.sort((a, b) => b.relevance - a.relevance || b.listing.id - a.listing.id);

  const wantedNames = ranked.map(({ listing }) => listing.wanted.marketHashName).filter((name) => name && name !== "*");
  const wantedCatalog = await getCatalogItemsByNames(wantedNames);

  return <main className="app-shell">
    <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
    <AppNav active="discover" />
    <section className="section-head discover-head"><div><span className="eyebrow">TRADE MARKETPLACE</span><h1>Discover active trades</h1><p>Browse what other ItemFuse users are offering. Every item uses the same expandable card so you can compare details consistently.</p></div><div className="match-count"><b>{ranked.length}</b><span>listings</span></div></section>

    <form className="discover-toolbar" method="get">
      <input name="q" defaultValue={params.q ?? ""} placeholder="Search skins, knives, users…" />
      <select name="filter" defaultValue={filter}><option value="all">All listings</option><option value="wishlist">Matches my wishlist</option><option value="owned">I own what they want</option><option value="matches">Reciprocal matches</option></select>
      <button className="button primary inline-button" type="submit">Filter</button>
    </form>

    {ranked.length === 0 ? <section className="empty-state"><h3>No listings found</h3><p>Try a broader search or publish the first trade for the item you want.</p></section> : <section className="discover-grid uniform-discover-grid">
      {ranked.map(({ listing, onWishlist, youOwnWanted, matchScore }) => {
        const wantedVisual = listing.wanted.marketHashName === "*" ? null : wantedCatalog.get(listing.wanted.marketHashName);
        const wantedName = listing.wanted.marketHashName === "*" ? "Open to anything" : listing.wanted.marketHashName;
        const wantedSubtitle = `${listing.wanted.exterior ?? "Any exterior"} • ±${listing.wanted.tolerancePercent}% value`;
        return <article className="discover-card uniform-discover-card" key={listing.id}>
          <div className="discover-seller"><div className="friend-identity"><SteamAvatar src={listing.avatarUrl} name={listing.displayName} size={40} /><div><b>{listing.displayName}</b><small>ItemFuse trader</small></div></div>{matchScore !== null ? <span className="discover-score">{matchScore}% match</span> : null}</div>
          <div className="uniform-pair-grid discover-pair-grid">
            <ItemDisplayCard item={dbItemToDisplay(listing.offered)} eyebrow="THEY OFFER" showInspect compact />
            <div className="uniform-swap">⇄</div>
            <ItemDisplayCard item={catalogItemToDisplay({ id: `wanted-${listing.id}`, name: wantedName, imageUrl: wantedVisual?.imageUrl, priceCents: wantedVisual?.priceCents, subtitle: wantedSubtitle, exterior: listing.wanted.exterior })} eyebrow="THEY WANT" compact />
          </div>
          <div className="discover-badges">{onWishlist ? <span>★ On your wishlist</span> : null}{youOwnWanted ? <span>✓ You own what they want</span> : null}{matchScore !== null ? <span>⇄ Reciprocal match</span> : null}</div>
          {listing.notes ? <p className="discover-notes">“{listing.notes}”</p> : null}
          <div className="discover-actions"><Link className="button primary inline-button" href={`/offers/new?listing=${listing.id}`}>Make Offer</Link>{listing.tradeUrl ? <a className="button match-button" href={listing.tradeUrl} target="_blank" rel="noreferrer">Steam trade ↗</a> : <a className="button match-button" href={listing.profileUrl ?? `https://steamcommunity.com/profiles/${listing.steamId}`} target="_blank" rel="noreferrer">Steam profile ↗</a>}<Link className="want-link" href={`/wishlist?item=${encodeURIComponent(listing.offered.market_hash_name ?? listing.offered.name)}`}>Add to Wishlist</Link></div>
        </article>;
      })}
    </section>}
  </main>;
}
