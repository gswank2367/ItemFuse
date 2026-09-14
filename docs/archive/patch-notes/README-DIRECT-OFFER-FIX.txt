ItemFuse direct-offer database fix

Fixes:
- Normalizes PostgreSQL BIGINT user IDs to JavaScript numbers when ItemFuse users are read from Neon.
- Prevents valid direct friend offers from failing because "25" !== 25.
- Fixes hidden direct-listing cleanup order (wanted_items -> listing_items -> listings).
- Preserves the original offer error if cleanup itself ever fails.

No Neon migration is required.

Apply over your current ItemFuse project, then run:
  npm.cmd run build
  vercel.cmd --prod
