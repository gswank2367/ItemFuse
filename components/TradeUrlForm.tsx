"use client";

import { useState } from "react";

export default function TradeUrlForm({ initialValue }: { initialValue: string | null }) {
  const [value, setValue] = useState(initialValue ?? "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/profile/trade-url", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tradeUrl: value })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save Trade URL.");
      setStatus("Saved ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save Trade URL.");
    } finally { setSaving(false); }
  }

  return (
    <form className="trade-url-form" onSubmit={save}>
      <div><span className="eyebrow">STEAM TRADE URL</span><p>Add your personal Steam Trade Offer URL so accepted offers can hand off directly to Steam.</p></div>
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..." />
      <div className="trade-url-actions">
        <a className="button trade-url-find" href="https://steamcommunity.com/my/tradeoffers/privacy" target="_blank" rel="noreferrer">Find my Trade URL ↗</a>
        <button className="button match-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
      {status ? <small>{status}</small> : null}
    </form>
  );
}
