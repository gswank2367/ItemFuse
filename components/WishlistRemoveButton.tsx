"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WishlistRemoveButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch("/api/wishlist", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" className="text-button danger-link" onClick={remove} disabled={busy}>{busy ? "Removing…" : "Remove"}</button>;
}
