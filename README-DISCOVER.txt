TradeSync Discover + visual item search patch

Adds:
- Discover / Marketplace page for active TradeSync listings
- Relevance badges for wishlist, owned-want, and reciprocal matches
- Visual CS2 item search with item artwork and price where available
- Wishlist cards with real item artwork and estimated price where available
- Visual item picker in Open to Offers listing creation
- Community CS2 catalog fallback if Steam Data API bulk catalog is unavailable

No Neon migration is required.
Apply this ZIP directly over the existing TradeSync project root.
Then run:
  npm.cmd run build
  vercel.cmd --prod
