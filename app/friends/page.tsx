import Link from "next/link";
import AppNav from "@/components/AppNav";
import FriendsList from "@/components/FriendsList";
import { getKnownUsersBySteamIds, getUserBySteamId } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getSteamFriends, SteamFriendsPrivateError, SteamWebApiNotConfiguredError } from "@/lib/steam";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) return <main className="shell"><p>ItemFuse profile not found.</p></main>;

  let friends = [] as Awaited<ReturnType<typeof getSteamFriends>>;
  let error: string | null = null;
  let needsKey = false;
  try {
    friends = await getSteamFriends(session.steamId);
  } catch (err) {
    if (err instanceof SteamWebApiNotConfiguredError) needsKey = true;
    else if (err instanceof SteamFriendsPrivateError) error = err.message;
    else error = err instanceof Error ? err.message : "Could not load Steam friends.";
  }
  const knownUsers = await getKnownUsersBySteamIds(friends.map((friend) => friend.steamId));
  const cards = friends.map((friend) => ({
    steamId: friend.steamId,
    displayName: friend.displayName,
    avatarUrl: friend.avatarUrl,
    profileUrl: friend.profileUrl,
    online: friend.personaState > 0,
    tradeSyncMember: knownUsers.has(friend.steamId)
  }));

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
      <AppNav active="friends" />
      <section className="section-head"><div><span className="eyebrow">STEAM FRIENDS</span><h1>Friends with CS2 items</h1><p>ItemFuse checks public Steam inventories in small batches and only shows friends who currently have at least one CS2 item.</p></div><div className="match-count"><b>{friends.length}</b><span>friends to scan</span></div></section>

      {needsKey ? (
        <section className="setup-card"><span className="eyebrow">ONE-TIME SETUP</span><h2>Connect the official Steam Friends API</h2><p>Valve requires a server-side Steam Web API user key for friend lists. Create one for your ItemFuse domain, then add it to Vercel as <code>STEAM_WEB_API_KEY</code>.</p><a className="button primary inline-button" href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer">Create Steam Web API key ↗</a><small>Use <b>tradesync-swart.vercel.app</b> as the associated domain. Keep the key secret.</small></section>
      ) : error ? (
        <section className="empty-state"><h3>Friends unavailable</h3><p>{error}</p></section>
      ) : friends.length === 0 ? (
        <section className="empty-state"><h3>No public friends returned</h3><p>Steam did not return any friends for this account.</p></section>
      ) : <FriendsList friends={cards} />}
    </main>
  );
}
