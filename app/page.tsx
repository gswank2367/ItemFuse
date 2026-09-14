import SteamAvatar from "@/components/SteamAvatar";
import AppNav from "@/components/AppNav";
import InventoryBrowser from "@/components/InventoryBrowser";
import SyncInventoryButton from "@/components/SyncInventoryButton";
import { getInventory, getUserBySteamId } from "@/lib/db";
import { dbItemToDisplay } from "@/lib/item-display";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function Home() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="itemfuse-landing">
        <header className="landing-topbar">
          <a className="landing-brand-lockup" href="/" aria-label="ItemFuse home">
            <img src="/itemfuse-mark.png" alt="" />
            <span className="landing-brand-copy">
              <b>Item<span>Fuse</span></b>
              <small>TRADE • CONNECT • UPGRADE</small>
            </span>
          </a>
          <a className="landing-security-link" href="#security">Why Steam sign-in is safe</a>
        </header>

        <section className="landing-hero-v2">
          <div className="landing-ambient landing-ambient-one" />
          <div className="landing-ambient landing-ambient-two" />
          <div className="landing-logo-stage">
            <img src="/itemfuse-mark.png" alt="ItemFuse inventory box logo" />
          </div>
          <span className="landing-kicker">A MODERN CS2 TRADING COMMUNITY</span>
          <h1>Trade smarter.<br /><span>Find the item that fits.</span></h1>
          <p className="landing-hero-copy">
            Sync your public CS2 inventory, discover traders, build item-for-item offers,
            negotiate directly, and finish the exchange through Steam.
          </p>
          <a className="steam-button landing-steam-cta" href="/api/auth/steam/login">
            <span className="steam-cta-dot">S</span>
            <span>Sign in with Steam</span>
            <span className="steam-cta-arrow">→</span>
          </a>
          <div className="landing-trust-line">
            <span>✓ Official Steam OpenID</span>
            <span>✓ Non-custodial</span>
            <span>✓ Final trades happen on Steam</span>
          </div>
        </section>

        <section className="landing-feature-grid" aria-label="ItemFuse features">
          <article>
            <div className="landing-feature-icon">⌁</div>
            <h2>Real inventory data</h2>
            <p>Sync your public CS2 inventory with item artwork, float, seed, pattern, stickers, and pricing data where available.</p>
          </article>
          <article>
            <div className="landing-feature-icon">⇄</div>
            <h2>Direct offers</h2>
            <p>Build multi-item offers, counter, message, and compare estimated value before either player goes to Steam.</p>
          </article>
          <article>
            <div className="landing-feature-icon">◎</div>
            <h2>Smarter discovery</h2>
            <p>Use wishlists, matching, friends, Discover, and filters to find people holding items you actually want.</p>
          </article>
          <article>
            <div className="landing-feature-icon">◇</div>
            <h2>Items stay yours</h2>
            <p>ItemFuse never holds skins. Steam authentication confirms your identity and Steam handles the final trade offer.</p>
          </article>
        </section>

        <section className="landing-how">
          <div className="landing-section-heading">
            <span className="landing-kicker">HOW ITEMFUSE WORKS</span>
            <h2>From inventory to trade in four steps.</h2>
            <p>No deposits, no ItemFuse bots, and no need to hand your items to a third party.</p>
          </div>
          <div className="landing-steps">
            <div><b>01</b><span><strong>Sign in with Steam</strong><small>Steam verifies the account. ItemFuse never receives your Steam password.</small></span></div>
            <div><b>02</b><span><strong>Sync and discover</strong><small>Browse public inventories, create a wishlist, and find trade opportunities.</small></span></div>
            <div><b>03</b><span><strong>Negotiate an offer</strong><small>Select items from both sides, compare value, message, accept, or counter.</small></span></div>
            <div><b>04</b><span><strong>Complete it on Steam</strong><small>The final item exchange happens through Steam where both sides verify every item.</small></span></div>
          </div>
        </section>

        <section className="landing-security" id="security">
          <div className="landing-security-logo"><img src="/itemfuse-mark.png" alt="" /></div>
          <div className="landing-security-copy">
            <span className="landing-kicker">SAFE STEAM AUTHENTICATION</span>
            <h2>ItemFuse never sees your Steam password.</h2>
            <p>
              When you choose “Sign in with Steam,” your browser is sent to Steam’s own website.
              Steam verifies your account and returns your SteamID to ItemFuse. Your password,
              Steam Guard code, and Steam login credentials stay with Steam.
            </p>
            <div className="landing-security-points">
              <span>ItemFuse will never ask you to deposit a skin for verification.</span>
              <span>ItemFuse cannot bypass private Steam inventory or friends-list settings.</span>
              <span>Always verify the final items and account inside Steam before accepting a trade.</span>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-brand"><img src="/itemfuse-mark.png" alt="" /><b>Item<span>Fuse</span></b></div>
          <p>Trade • Connect • Upgrade</p>
          <p className="landing-footer-note">ItemFuse is an independent trading utility and is not affiliated with Valve Corporation.</p>
        </footer>
      </main>
    );
  }

  const user = await getUserBySteamId(session.steamId);
  if (!user) return <main className="shell"><p>Could not load your ItemFuse profile. Sign out and try again.</p></main>;
  const items = await getInventory(user.id);
  const enrichedCount = items.filter((item) => item.enriched).length;
  const displayItems = items.map(dbItemToDisplay);

  return (
    <main className="app-shell inventory-shell">
      <header className="app-header">
        <div className="brand"><span>↯</span> ItemFuse</div>
        <LogoutButton />
      </header>
      <AppNav active="inventory" />

      <section className="profile-strip">
        <div className="profile-main">
          <SteamAvatar src={user.avatar_url} name={user.display_name} alt="Steam avatar" size={64} className="avatar" />
          <div><div className="eyebrow">SIGNED IN WITH STEAM</div><h2>{user.display_name}</h2><a href={user.profile_url ?? `https://steamcommunity.com/profiles/${user.steam_id}`} target="_blank" rel="noreferrer">View Steam profile ↗</a></div>
        </div>
        <div className="sync-area"><SyncInventoryButton /><span>Last sync: {formatDate(user.last_inventory_sync)}</span></div>
      </section>

      <section className="hero-panel inventory-hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR CS2 INVENTORY</span>
          <h1>{items.length ? `${items.length} items synced` : "Bring your inventory into ItemFuse"}</h1>
          <p>{items.length ? `${enrichedCount} items currently carry exact enrichment data for float, seed, pattern/phase, pricing, stickers and inspect links where applicable.` : "Sync your public CS2 inventory to replace the demo items with your real skins."}</p>
          {items.length ? <div className="hero-highlights"><span>Exact float, seed & pattern data</span><span>Click any item to expand details</span><span>Filter and sort instantly</span></div> : null}
        </div>
        <div className="metric"><b>{items.filter(i => i.tradable).length}</b><span>Tradable now</span></div>
      </section>

      {items.length === 0 ? (
        <section className="empty-state"><div className="empty-icon">◎</div><h3>No inventory synced yet</h3><p>Make your Steam inventory public, then tap <b>Sync CS2 Inventory</b>.</p></section>
      ) : <InventoryBrowser items={displayItems} mode="own" />}
    </main>
  );
}
