"use client";

import { useState } from "react";
import type { ThreadMessage } from "@/lib/db";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function ThreadMessages({ threadId, viewerUserId, otherName, initialMessages }: { threadId: number; viewerUserId: number; otherName: string; initialMessages: ThreadMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId, body }),
      });
      const payload = await response.json() as { message?: ThreadMessage; error?: string };
      if (!response.ok || !payload.message) throw new Error(payload.error || "Could not send message.");
      setMessages((current) => [...current, payload.message!]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="thread-panel">
      <div className="thread-head"><div><span className="eyebrow">TRADE CHAT</span><h2>Messages with {otherName}</h2></div><span>{messages.length} messages</span></div>
      <div className="message-list">
        {messages.length ? messages.map((message) => {
          const mine = message.senderUserId === viewerUserId;
          return <div className={`message-bubble${mine ? " mine" : ""}`} key={message.id}><p>{message.body}</p><small>{mine ? "You" : otherName} · {formatDate(message.createdAt)}</small></div>;
        }) : <div className="message-empty">No messages yet. Keep the negotiation here so both sides can reference the offer.</div>}
      </div>
      <div className="message-compose"><textarea maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Message about the trade…" /><button className="button primary" type="button" disabled={sending || !body.trim()} onClick={send}>{sending ? "Sending…" : "Send"}</button></div>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
