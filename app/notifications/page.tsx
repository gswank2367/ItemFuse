import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import LogoutButton from "@/components/LogoutButton";
import NotificationReadButton from "@/components/NotificationReadButton";
import { getNotificationsForUser, getUserBySteamId } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function when(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/?reauth=1");
  const user = await getUserBySteamId(session.steamId);
  if (!user) redirect("/?reauth=1");
  const notifications = await getNotificationsForUser(user.id);
  const unread = notifications.filter((item) => !item.readAt).length;

  return <main className="app-shell">
    <header className="app-header"><div className="brand"><span>↯</span> ItemFuse</div><LogoutButton /></header>
    <AppNav active="notifications" />
    <section className="section-head"><div><span className="eyebrow">ACTIVITY</span><h1>Notifications</h1><p>Offers, counteroffers, trade messages, and offer decisions show up here.</p></div><div className="notification-head-actions"><div className="match-count"><b>{unread}</b><span>unread</span></div>{unread ? <NotificationReadButton /> : null}</div></section>
    {notifications.length ? <section className="notification-list">{notifications.map((item) => <Link className={`notification-card${item.readAt ? "" : " unread"}`} href={item.href ?? "/trades"} key={item.id}><span className="notification-dot" /><div><b>{item.title}</b>{item.body ? <p>{item.body}</p> : null}<small>{when(item.createdAt)}</small></div><span>›</span></Link>)}</section> : <section className="empty-state"><h3>No notifications yet</h3><p>New offers and trade messages will appear here.</p></section>}
  </main>;
}
