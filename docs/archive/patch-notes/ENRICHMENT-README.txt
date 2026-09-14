TradeSync exact-item enrichment patch

Adds optional Steam Data API inventory enrichment using STEAMDATA_API_KEY.
When configured, a normal TradeSync sync still reads Steam for the base inventory, then merges exact metadata by assetid:
- float
- paint seed + paint index
- Doppler/Gamma phase
- fade percentage
- Case Hardened / Heat Treated blue-gem classification
- resolved inspect link
- sticker wear/scrape
- charms + patches
- Steam and estimated values

No database migration is required. Enrichment is cached inside the existing raw_description JSONB column, and inspect_link uses the existing column.

Vercel variable:
  STEAMDATA_API_KEY = sdk_...

Steam Data API inventory access requires a plan that includes Inventory (currently Pro+ or higher).
