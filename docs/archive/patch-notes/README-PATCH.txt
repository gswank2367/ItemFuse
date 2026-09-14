TradeSync ΓÇö Trading + Steam Friends patch

Adds:
- Open to Offers button on tradable inventory items
- Create trade listings with exact wanted item or "open to anything"
- Preferred exterior and value tolerance
- Active listings page
- Reciprocal match scoring between TradeSync users
- Steam Trade URL setting for handoff to Steam
- Steam Friends page using Valve's official Web API
- Friend inventory browsing (public inventories only)
- TradeSync member badges on Steam friends
- Inventory sync upserts assets instead of delete/reinsert, preserving active listings

No Neon schema migration is required; the existing users, listings, listing_items, wanted_items and inventory_items tables are used.

New Vercel environment variable required for Friends:
STEAM_WEB_API_KEY=<official Valve Steam Web API user key>

Create the key at:
https://steamcommunity.com/dev/apikey
Associated domain: tradesync-swart.vercel.app

Friends List privacy must be Public for Valve GetFriendList to return it.
Friend CS2 inventories must individually be Public to browse them.
