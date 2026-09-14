TradeSync - Item picker + Friends CS2 filter patch

Changes:
- Item search dropdown closes immediately after choosing an item.
- Dropdown also closes on outside click/tap and Escape.
- Friends page only renders Steam friends with at least one public CS2 inventory item.
- Friend inventory checks run in small batches to reduce Steam rate limiting.
- Friend CS2 inventory status is cached in Neon for 12 hours.
- If Steam rate-limits a check, that friend is temporarily hidden rather than shown incorrectly.

Database:
- friend_inventory_cache table has already been created in the connected TradeSync Neon database.

Apply this ZIP as a flat overlay to the existing TradeSync project root, then run:
  npm.cmd run build
  vercel.cmd --prod
