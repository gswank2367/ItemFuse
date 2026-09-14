import Link from "next/link";

export default function AppNav({ active }: { active: "inventory" | "discover" | "wishlist" | "trades" | "matches" | "friends" | "notifications" }) {
  const configuredOrigin = process.env.APP_URL?.trim().replace(/\/$/, "") || "";
  const links = [
    ["inventory", "/", "Inventory"],
    ["discover", "/discover", "Discover"],
    ["wishlist", "/wishlist", "Wishlist"],
    ["trades", "/trades", "Trades"],
    ["matches", "/matches", "Matches"],
    ["friends", "/friends", "Friends"],
    ["notifications", "/notifications", "Alerts"],
  ] as const;

  return <nav className="app-nav itemfuse-nav" aria-label="ItemFuse primary navigation">{links.map(([key, href, label]) => <Link key={key} href={`${configuredOrigin}${href}`} prefetch={false} className={active === key ? "active" : ""}>{label}</Link>)}</nav>;
}
