import SteamAvatar from "@/components/SteamAvatar";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import ItemDisplayCard from "@/components/ItemDisplayCard";
import { getMatchesForUser, getUserBySteamId } from "@/lib/db";
import { dbItemToDisplay } from "@/lib/item-display";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) return <main className="shell"><p>ItemFuse profile not found.</p></main>;
  const matches = await getMatchesForUser(user.id);

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
      <AppNav active="matches" />
      <section className="section-head"><div><span className="eyebrow">RECIPROCAL MATCHING</span><h1>Your best trade matches</h1><p>A match appears when your wants fit their offer and their wants fit yours. Click either item to inspect its full details.</p></div><div className="match-count"><b>{matches.length}</b><span>matches</span></div></section>

      {matches.length === 0 ? <section className="empty-state"><h3>No reciprocal matches yet</h3><p>Your listings are active. As more ItemFuse users publish the opposite trade, they'll appear here automatically.</p><Link className="button primary inline-button" href="/trades">Review listings</Link></section> : (
        <section className="match-list">
          {matches.map((match, index) => {
            const theirs = match.theirListing;
            return <article className="match-card uniform-match-card" key={`${match.yourListing.id}-${theirs.id}-${index}`}>
              <div className="match-header"><div className="friend-identity"><SteamAvatar src={theirs.avatarUrl} name={theirs.displayName} size={46} /><div><h3>{theirs.displayName}</h3><a href={theirs.profileUrl ?? `https://steamcommunity.com/profiles/${theirs.steamId}`} target="_blank" rel="noreferrer">Steam profile ↗</a></div></div><div className="match-score"><b>{match.score}%</b><span>Match</span></div></div>
              <div className="uniform-pair-grid">
                <ItemDisplayCard item={dbItemToDisplay(match.yourListing.offered)} eyebrow="YOU GIVE" showInspect compact />
                <div className="uniform-swap">⇄</div>
                <ItemDisplayCard item={dbItemToDisplay(theirs.offered)} eyebrow="YOU GET" showInspect compact />
              </div>
              <div className="match-footer"><span>{match.valueDeltaPercent === null ? "Value comparison unavailable" : `${match.valueDeltaPercent.toFixed(1)}% appraised midpoint difference`}</span><div className="match-action-stack"><Link className="button primary inline-button" href={`/offers/new?listing=${theirs.id}`}>Make Offer</Link>{theirs.tradeUrl ? <a className="button match-button" href={theirs.tradeUrl} target="_blank" rel="noreferrer">Steam trade ↗</a> : <a className="button match-button" href={theirs.profileUrl ?? `https://steamcommunity.com/profiles/${theirs.steamId}`} target="_blank" rel="noreferrer">Steam profile ↗</a>}</div></div>
            </article>;
          })}
        </section>
      )}
    </main>
  );
}
