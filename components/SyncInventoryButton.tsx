"use client";

import { useEffect, useState } from "react";

export default function SyncInventoryButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sync() {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/inventory/sync", { method: "POST", credentials: "same-origin" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setCooldown(Math.max(Number(data.retryAfterSeconds) || 60, 60));
        }
        throw new Error(data.error || "Inventory sync failed");
      }

      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inventory sync failed");
      setBusy(false);
    }
  }

  const minutes = Math.max(1, Math.ceil(cooldown / 60));
  const label = busy
    ? "Syncing Steam inventory…"
    : cooldown > 0
      ? `Steam cooldown — try in ${minutes}m`
      : "Sync CS2 Inventory";

  return (
    <div className="sync-wrap">
      <button className="button primary" onClick={sync} disabled={busy || cooldown > 0}>
        {label}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
