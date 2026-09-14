TradeSync sticker market-price hover patch

Why every applied sticker previously showed Price unavailable:
Steam Data API's inventory response intentionally does not include prices for applied stickers. An applied sticker is permanently attached to a weapon and cannot be sold separately.

This patch keeps the applied sticker separate from the standalone sticker market price. On hover/focus/tap, TradeSync looks up the corresponding standalone Sticker | ... market item using the existing server-side STEAMDATA_API_KEY and displays its current reference price as "Unapplied: $X.XX".

The reference price is informational only and is not added directly to the weapon's estimated value.

Files:
- components/ItemDisplayCard.tsx
- app/api/catalog/sticker-price/route.ts

No database migration and no new environment variables are required.

After extracting over the TradeSync project:
  npm.cmd run build
  vercel.cmd --prod
