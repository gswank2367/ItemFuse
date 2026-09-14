ItemFuse branding patch

This is a presentation/branding-only overlay for the existing app.

Changes:
- TradeSync -> ItemFuse throughout visible app copy and metadata.
- Landing tagline: "Fuse the right inventories. Find the trade that fits."
- ItemFuse blue/electric-green brand accent.
- package.json display/package name becomes itemfuse.
- Current APP_URL / Vercel hostname remains unchanged for now.

Intentionally NOT changed:
- tradesync_session cookie name (preserves existing sessions and avoids auth regressions)
- Neon database/table names or IDs
- Vercel project ID/name
- APP_URL
- Steam Web API associated domain

After itemfuse.com is purchased and connected, update APP_URL and the Steam Web API domain association in a separate cutover.
