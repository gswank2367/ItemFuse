import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import DirectOfferBuilder from "@/components/DirectOfferBuilder";
import LogoutButton from "@/components/LogoutButton";
import SteamAvatar from "@/components/SteamAvatar";
import { getInventory, getUserBySteamId } from "@/lib/db";
import { dbItemToDisplay } from "@/lib/item-display";
import { getSession } from "@/lib/session";
import { getSteamFriends } from "@/lib/steam";

export const dynamic = "force-dynamic";

export default async function DirectFriendOfferPage({ params }: { params: Promise<{ steamId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) redirect("/?reauth=1");

  const { steamId } = await params;
  const friends = await getSteamFriends(session.steamId);
  const friend = friends.find((entry) => entry.steamId === steamId);
  if (!friend) redirect("/friends");

  const friendUser = await getUserBySteamId(steamId);
  if (!friendUser) {
    return (
      <main className="app-shell">
        <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
        <AppNav active="friends" />
        <section className="empty-state"><h3>{friend.displayName} has not joined ItemFuse yet</h3><p>Direct in-app offers require both traders to have an ItemFuse account so offers, counteroffers, notifications and chat have a verified recipient.</p><Link href={`/friends/${steamId}`}>← Back to their inventory</Link></section>
      </main>
    );
  }

  const [ownRows, friendRows] = await Promise.all([getInventory(user.id), getInventory(friendUser.id)]);
  const ownItems = ownRows.filter((item) => item.tradable).map(dbItemToDisplay);
  const friendItems = friendRows.filter((item) => item.tradable).map(dbItemToDisplay);

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
      <AppNav active="friends" />
      <section className="section-head offer-new-head">
        <div><span className="eyebrow">DIRECT FRIEND OFFER</span><h1>Build an offer for {friend.displayName}</h1><p>No listing is required. Pick items from both ItemFuse inventories and send the proposal directly to your friend.</p></div>
        <div className="offer-target-user"><SteamAvatar src={friendUser.avatar_url ?? friend.avatarUrl} name={friend.displayName} size={42} /><span><small>Trading with</small><b>{friend.displayName}</b></span></div>
      </section>

      {!ownItems.length || !friendItems.length ? (
        <section className="empty-state"><h3>Not enough tradable inventory data</h3><p>{!ownItems.length ? "Sync your ItemFuse inventory first. " : ""}{!friendItems.length ? `${friend.displayName} needs at least one tradable item in their synced ItemFuse inventory.` : ""}</p><Link href={`/friends/${steamId}`}>Back to friend inventory</Link></section>
      ) : (
        <DirectOfferBuilder otherSteamId={steamId} otherDisplayName={friend.displayName} ownItems={ownItems} friendItems={friendItems} />
      )}
    </main>
  );
}
