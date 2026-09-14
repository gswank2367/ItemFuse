import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import LogoutButton from "@/components/LogoutButton";
import OfferBuilder from "@/components/OfferBuilder";
import SteamAvatar from "@/components/SteamAvatar";
import { getInventory, getListingById, getOfferById, getUserBySteamId } from "@/lib/db";
import { dbItemToDisplay } from "@/lib/item-display";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewOfferPage({ searchParams }: { searchParams: Promise<{ listing?: string; counter?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) redirect("/?reauth=1");
  const params = await searchParams;
  const listingId = Number(params.listing);
  if (!Number.isInteger(listingId) || listingId <= 0) redirect("/discover");

  const listing = await getListingById(listingId);
  if (!listing || !["active", "direct"].includes(listing.status)) redirect("/discover");

  let otherUserId = listing.userId;
  let otherDisplayName = listing.displayName;
  let requestedItems = [dbItemToDisplay(listing.offered)];
  let preselectedOwnItemIds: number[] = [];
  let parentOfferId: number | null = null;

  if (listing.status === "direct" && !params.counter) redirect("/trades");

  if (params.counter) {
    parentOfferId = Number(params.counter);
    const parent = await getOfferById(parentOfferId);
    if (!parent || parent.status !== "pending") redirect("/trades");
    const participants = [parent.userA.id, parent.userB.id];
    if (!participants.includes(user.id) || parent.listingId !== listingId) redirect("/trades");
    const other = parent.userA.id === user.id ? parent.userB : parent.userA;
    otherUserId = other.id;
    otherDisplayName = other.display_name;
    requestedItems = (parent.itemsByUser[other.id] ?? []).map(dbItemToDisplay);
    preselectedOwnItemIds = (parent.itemsByUser[user.id] ?? []).map((item) => item.id);
  } else if (listing.userId === user.id) {
    redirect("/trades");
  }

  const ownItems = (await getInventory(user.id)).filter((item) => item.tradable).map(dbItemToDisplay);
  if (!requestedItems.length) redirect("/trades");

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
      <AppNav active="trades" />
      <section className="section-head offer-new-head">
        <div><span className="eyebrow">{parentOfferId ? "COUNTEROFFER" : "STRUCTURED OFFER"}</span><h1>{parentOfferId ? "Build your counteroffer" : "Make a trade offer"}</h1><p>Select exactly what you are willing to give. ItemFuse compares both sides before the trade is handed off to Steam.</p></div>
        <div className="offer-target-user"><SteamAvatar src={listing.avatarUrl} name={otherDisplayName} size={42} /><span><small>Trading with</small><b>{otherDisplayName}</b></span></div>
      </section>
      <OfferBuilder listingId={listingId} otherUserId={otherUserId} otherDisplayName={otherDisplayName} ownItems={ownItems} requestedItems={requestedItems} preselectedOwnItemIds={preselectedOwnItemIds} parentOfferId={parentOfferId} />
    </main>
  );
}
