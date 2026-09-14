TradeSync metadata patch

Adds:
- Steam asset_properties ingestion
- Float value (property 2) when Valve provides it
- Paint seed (property 1)
- New 2026 inspect-link property 6 substitution
- Sticker names + sticker artwork from Steam descriptions
- Charm names + artwork
- iPhone-safe inspect behavior: copy link instead of attempting to launch CS2

No database schema migration is required. After deployment, run Sync CS2 Inventory once so the newer asset_properties are persisted.
