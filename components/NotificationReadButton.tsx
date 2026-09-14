"use client";

import { useState } from "react";

export default function NotificationReadButton() {
  const [busy, setBusy] = useState(false);
  async function markAll() {
    setBusy(true);
    await fetch("/api/notifications/read", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    window.location.reload();
  }
  return <button className="button match-button" type="button" onClick={markAll} disabled={busy}>{busy ? "Updating…" : "Mark all read"}</button>;
}
