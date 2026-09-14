export default function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post" className="logout-form">
      <button type="submit" className="ghost-link logout-button">Sign out</button>
    </form>
  );
}
