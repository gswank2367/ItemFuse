import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import ItemDisplayCard from "@/components/ItemDisplayCard";
import LogoutButton from "@/components/LogoutButton";
import OfferActions from "@/components/OfferActions";
import SteamAvatar from "@/components/SteamAvatar";
import ThreadMessages from "@/components/ThreadMessages";
import { getOfferById, getThreadMessages, getUserBySteamId } from "@/lib/db";
import { dbItemToDisplay } from "@/lib/item-display";
import { getSession } from "@/lib/session";
import { appraisalRangesOverlap, sumAppraisals } from "@/lib/appraisal";

export const dynamic = "force-dynamic";

function money(cents: number | null) {
  return cents === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function moneyRange(total: ReturnType<typeof sumAppraisals>) {
  if (!total.pricedItems) return "—";
  if (Math.abs(total.lowCents - total.highCents) < 1) return money(total.lowCents);
  return `${money(total.lowCents)} – ${money(total.highCents)}`;
}

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) redirect("/?reauth=1");
  const { id } = await params;
  const offer = await getOfferById(Number(id));
  if (!offer) redirect("/trades");
  if (offer.userA.id !== user.id && offer.userB.id !== user.id) redirect("/trades");

  const other = offer.userA.id === user.id ? offer.userB : offer.userA;
  const yours = (offer.itemsByUser[user.id] ?? []).map(dbItemToDisplay);
  const theirs = (offer.itemsByUser[other.id] ?? []).map(dbItemToDisplay);
  const yourRange = sumAppraisals(yours);
  const theirRange = sumAppraisals(theirs);
  const yourTotal = yourRange.pricedItems ? yourRange.midpointCents : null;
  const theirTotal = theirRange.pricedItems ? theirRange.midpointCents : null;
  const delta = yourTotal && theirTotal ? Math.abs(yourTotal - theirTotal) / Math.max(yourTotal, theirTotal) * 100 : null;
  const rangesOverlap = appraisalRangesOverlap(yourRange, theirRange);
  const messages = await getThreadMessages(offer.threadId, user.id);
  const canRespond = offer.status === "pending" && offer.initiatorUserId !== user.id;
  const canCancel = offer.status === "pending" && offer.initiatorUserId === user.id;

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
      <AppNav active="trades" />
      <section className="offer-detail-head">
        <div className="offer-person"><SteamAvatar src={other.avatar_url} name={other.display_name} size={52} /><div><span className="eyebrow">TRADE OFFER #{offer.id}</span><h1>{other.display_name}</h1><a href={other.profile_url ?? `https://steamcommunity.com/profiles/${other.steam_id}`} target="_blank" rel="noreferrer">Steam profile ↗</a></div></div>
        <div className={`offer-status status-${offer.status}`}><small>Status</small><b>{offer.status}</b></div>
      </section>

      <section className="offer-value-bar">
        <span><small>Your side</small><b>{moneyRange(yourRange)}</b></span>
        <strong>{delta === null ? "Appraisal comparison unavailable" : rangesOverlap ? `Appraisal ranges overlap • ${delta.toFixed(1)}% midpoint difference` : `${delta.toFixed(1)}% midpoint difference`}</strong>
        <span><small>Their side</small><b>{moneyRange(theirRange)}</b></span>
      </section>

      <section className="offer-detail-grid">
        <div className="offer-side"><div className="offer-side-title"><span className="eyebrow">YOU GIVE</span><b>{yours.length} item{yours.length === 1 ? "" : "s"}</b></div><div className="offer-side-items">{yours.map((item) => <ItemDisplayCard key={item.id} item={item} showInspect compact />)}</div></div>
        <div className="uniform-swap offer-large-swap">⇄</div>
        <div className="offer-side"><div className="offer-side-title"><span className="eyebrow">YOU RECEIVE</span><b>{theirs.length} item{theirs.length === 1 ? "" : "s"}</b></div><div className="offer-side-items">{theirs.map((item) => <ItemDisplayCard key={item.id} item={item} showInspect compact />)}</div></div>
      </section>

      {offer.note ? <section className="offer-note"><span className="eyebrow">OFFER NOTE</span><p>{offer.note}</p></section> : null}

      {offer.status === "pending" ? <OfferActions offerId={offer.id} canRespond={canRespond} canCancel={canCancel} counterHref={`/offers/new?listing=${offer.listingId}&counter=${offer.id}`} /> : null}

      {offer.status === "accepted" ? <section className="accepted-handoff"><div><span className="eyebrow">AGREED IN ITEMFUSE</span><h2>Finish the trade on Steam</h2><p>Re-check every item in Steam before accepting the final trade offer.</p></div>{other.trade_url ? <a className="button primary inline-button" href={other.trade_url} target="_blank" rel="noreferrer">Open Steam Trade ↗</a> : <a className="button match-button" href={other.profile_url ?? `https://steamcommunity.com/profiles/${other.steam_id}`} target="_blank" rel="noreferrer">Open Steam profile ↗</a>}</section> : null}

      <section className="trade-safety-card"><b>ItemFuse safety check</b><span>Never send items to a “verification” account, install a trading browser extension, or enter Steam credentials anywhere except Steam. ItemFuse never holds your items.</span></section>
      <ThreadMessages threadId={offer.threadId} viewerUserId={user.id} otherName={other.display_name} initialMessages={messages} />
      <div className="offer-back-link"><Link href="/trades">← Back to Trades</Link></div>
    </main>
  );
}
