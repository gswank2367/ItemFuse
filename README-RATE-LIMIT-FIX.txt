TradeSync Friends inventory scan — rate-limit/resume fix

Changes:
- Reduces Steam inventory probe batch size from 8 to 3.
- Probes friends sequentially server-side instead of bursting two inventory requests at once.
- Stops a batch immediately after Steam returns HTTP 429.
- Reads Retry-After when Steam supplies it.
- Automatically pauses and retries instead of permanently hiding rate-limited friends.
- Keeps successful checks in the existing Neon friend_inventory_cache table for 12 hours.
- If Steam continues throttling after several retries, shows Continue scan; completed progress stays cached.
- No database migration required.
