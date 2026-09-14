"use client";

import { useState } from "react";

export default function OfferActions({ offerId, canRespond, canCancel, counterHref }: { offerId: number; canRespond: boolean; canCancel: boolean; counterHref: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function act(action: "accept" | "reject" | "cancel") {
    setBusy(action);
    setError("");
    try {
      const response = await fetch(`/api/offers/${offerId}/action`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not update offer.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update offer.");
      setBusy(null);
    }
  }

  return (
    <div className="offer-action-box">
      {canRespond ? <>
        <button className="button offer-accept" disabled={Boolean(busy)} onClick={() => act("accept")}>{busy === "accept" ? "Accepting…" : "Accept offer"}</button>
        <a className="button offer-counter" href={counterHref}>Counteroffer</a>
        <button className="button offer-decline" disabled={Boolean(busy)} onClick={() => act("reject")}>{busy === "reject" ? "Declining…" : "Decline"}</button>
      </> : null}
      {canCancel ? <button className="button offer-decline" disabled={Boolean(busy)} onClick={() => act("cancel")}>{busy === "cancel" ? "Cancelling…" : "Cancel offer"}</button> : null}
      {error ? <small className="form-error">{error}</small> : null}
    </div>
  );
}
