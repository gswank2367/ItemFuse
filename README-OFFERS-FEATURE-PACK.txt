ItemFuse Offers & Negotiation Feature Pack

Adds:
- Structured multi-item trade offers
- Make Offer buttons on Discover and Matches
- Accept / Decline / Counteroffer / Cancel
- Offer-linked trade chat
- Notifications / Alerts page
- Offer history on Trades
- Steam handoff after accepted offers
- "Find my Trade URL" helper linking to Steam's official trade-offer privacy page
- Preserves inventory filters, value range, aligned item cards, sticker market-price lookup, and cached friend inventory behavior

IMPORTANT:
This feature pack requires the accompanying Neon migration for:
  trade_threads
  offers
  offer_items
  messages.thread_id
  notifications

Do not deploy this pack until the Neon migration has been applied to the live database.

After migration approval and application:
  cd "$env:USERPROFILE\TradeSync"
  Expand-Archive the ZIP over the project with -Force
  npm.cmd run build
  vercel.cmd --prod
