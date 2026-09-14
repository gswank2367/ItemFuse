import SteamAvatar from "@/components/SteamAvatar";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import InventoryBrowser from "@/components/InventoryBrowser";
import { steamItemToDisplay } from "@/lib/item-display";
import { getSession } from "@/lib/session";
import { getCachedCs2InventoryDisplay, getCs2Inventory, getSteamFriends } from "@/lib/steam";
import { redirect } from "next/navigation";
import { getUserBySteamId } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function FriendInventoryPage({ params }: { params: Promise<{ steamId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const { steamId } = await params;
  const friends = await getSteamFriends(session.steamId);
  const friend = friends.find((entry) => entry.steamId === steamId);
  if (!friend) return <main className="app-shell"><AppNav active="friends" /><section className="empty-state"><h3>Friend not found</h3><p>This Steam account is not in the signed-in user's current public friend list.</p><Link href="/friends">Back to friends</Link></section></main>;
  const friendUser = await getUserBySteamId(friend.steamId);

  let displayItems: Awaited<ReturnType<typeof getCachedCs2InventoryDisplay>> = [];
  let error: string | null = null;
  let source = "cached";
  try {
    displayItems = await getCachedCs2InventoryDisplay(friend.steamId);
    if (!displayItems.length) {
      source = "live fallback";
      const liveItems = await getCs2Inventory(friend.steamId, { enrich: true });
      displayItems = liveItems.map(steamItemToDisplay);
    }
  } catch (providerError) {
    try {
      source = "live fallback";
      const liveItems = await getCs2Inventory(friend.steamId, { enrich: true });
      displayItems = liveItems.map(steamItemToDisplay);
    } catch (liveError) {
      error = liveError instanceof Error ? liveError.message : providerError instanceof Error ? providerError.message : "Could not load this inventory.";
    }
  }

  return (
    <main className="app-shell inventory-shell">
      <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
      <AppNav active="friends" />
      <section className="friend-inventory-head"><div className="friend-identity"><SteamAvatar src={friend.avatarUrl} name={friend.displayName} size={64} /><div><span className="eyebrow">STEAM FRIEND</span><h1>{friend.displayName}</h1><a href={friend.profileUrl ?? `https://steamcommunity.com/profiles/${friend.steamId}`} target="_blank" rel="noreferrer">View Steam profile ↗</a>{friendUser ? <div style={{ marginTop: 10 }}><Link className="button match-button" href={`/offers/direct/${friend.steamId}`}>Send direct offer</Link></div> : null}</div></div><div><b>{displayItems.length}</b><span>CS2 items</span></div></section>
      <p className="privacy-note">Friend inventories use a cached provider snapshot when available ({source}). Search, filter and sort locally without making extra Steam requests.</p>

      {error ? <section className="empty-state"><h3>Inventory unavailable</h3><p>{error}</p><p>If their inventory is private, they must make it public on Steam before ItemFuse can display it.</p></section> : (
        displayItems.length ? <InventoryBrowser items={displayItems} mode="friend" /> : <section className="empty-state"><h3>No CS2 items found</h3><p>This public inventory is currently empty.</p></section>
      )}
    </main>
  );
}
