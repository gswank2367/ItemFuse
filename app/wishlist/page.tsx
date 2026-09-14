import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import WishlistForm from "@/components/WishlistForm";
import WishlistRemoveButton from "@/components/WishlistRemoveButton";
import ItemDisplayCard from "@/components/ItemDisplayCard";
import { getUserBySteamId, getWishlistForUser } from "@/lib/db";
import { getCatalogItemsByNames } from "@/lib/catalog";
import { catalogItemToDisplay } from "@/lib/item-display";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) redirect("/?reauth=1");
  const [wishlist, params] = await Promise.all([getWishlistForUser(user.id), searchParams]);
  const catalog = await getCatalogItemsByNames(wishlist.map((item) => item.marketHashName));

  return (
    <main className="app-shell">
      <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
      <AppNav active="wishlist" />
      <section className="section-head"><div><span className="eyebrow">WANTED ITEMS</span><h1>Your Wishlist</h1><p>Add items you are actively looking for. Click any saved item to expand its visual details and current catalog value when available.</p></div><div className="match-count"><b>{wishlist.length}</b><span>wanted</span></div></section>
      <section className="wishlist-layout">
        <div className="builder-form-card"><span className="eyebrow">ADD A WANT</span><h2>What are you looking for?</h2><WishlistForm defaultItem={params.item ?? ""} /></div>
        <div className="wishlist-grid uniform-grid">
          {wishlist.length === 0 ? <section className="empty-state compact-empty wishlist-empty"><h3>Your wishlist is empty</h3><p>Search for a knife, skin, gloves, or another CS2 item. Search results include real item photos.</p></section> : wishlist.map((item) => {
            const visual = catalog.get(item.marketHashName);
            const constraints = [item.exterior || "Any exterior", item.phase || null, item.maxFloat !== null ? `Float ≤ ${item.maxFloat}` : null, `±${item.tolerancePercent}% value`].filter(Boolean).join(" • ");
            return <div className="wishlist-uniform-wrap" key={item.id}>
              <ItemDisplayCard
                item={catalogItemToDisplay({ id: item.id, name: item.marketHashName, imageUrl: visual?.imageUrl, priceCents: visual?.priceCents, subtitle: constraints, exterior: item.exterior, phase: item.phase })}
                eyebrow="WANTED"
                compact
              />
              {item.notes ? <p className="wishlist-uniform-notes">{item.notes}</p> : null}
              <WishlistRemoveButton id={item.id} />
            </div>;
          })}
        </div>
      </section>
    </main>
  );
}
