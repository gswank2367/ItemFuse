TradeSync uniform item cards + details patch

Adds:
- Fixed-size item cards across Inventory, Friends, Wishlist, Trades, Matches and Discover.
- Click/tap any item card to open a full details modal.
- Full details show image, value sources, float, seed, paint index, phase/fade, exterior, rarity and pattern data.
- Sticker/charm/patch displays.
- Sticker hover/focus tooltip shows sticker name, scrape percentage and estimated price when enrichment provides it.
- Mobile-friendly modal and sticker tooltip behavior.
- No database migration required.

After extracting over the TradeSync project:
  npm.cmd run build
  vercel.cmd --prod

If sticker price says Price unavailable, re-sync the inventory so current enrichment can be stored for that item.
