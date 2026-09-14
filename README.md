# TradeSync — real Steam inventory milestone

This branch is the first real backend-enabled TradeSync build.

## Implemented
- Steam OpenID login (no Steam password touches TradeSync)
- Signed HTTP-only 30-day sessions
- Neon Postgres user/inventory storage
- Public CS2 inventory sync using app 730 / context 2
- Steam inventory pagination
- Real Steam item artwork
- Tradable / marketable status
- Exterior, rarity, weapon metadata when supplied by Steam
- Inspect-in-Steam links when supplied by the inventory description
- Mobile-first UI for iPhone

## Required environment variables
- `APP_URL` — optional production origin override
- `DATABASE_URL` — Neon pooled PostgreSQL connection string
- `SESSION_SECRET` — random secret, 32+ characters

## Privacy limitation
Steam OpenID proves identity but does not grant TradeSync access to a private CS2 inventory. The user inventory must be public for sync to work.
