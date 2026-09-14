ItemFuse Appraisal Engine v1

What this patch does
- Replaces simple single-source values with an ItemFuse appraisal range.
- Uses available market references as the base range.
- Adds conservative float premiums based on quality within the item's wear band.
- Adds separate Blue Gem collector-premium ranges using tier, rank and weighted blue coverage.
- Adds conservative Fade % and Doppler phase signals when exact enrichment data is available.
- Adds High / Medium / Low confidence labels.
- Shows the appraisal breakdown in the expanded item-details modal.
- Inventory total ranges and price sorting now use ItemFuse appraisal values.
- Listing offer builders and direct-friend offers use appraisal values.
- Offer fairness uses appraisal ranges and identifies when the two sides overlap.
- Reciprocal match value tolerance now uses appraisal midpoints.
- New-trade item preview shows the ItemFuse appraisal.

Important
- This is a conservative heuristic model, not a guaranteed sale price.
- Extremely rare patterns, top-ranked floats, and collector items can trade outside the model range.
- No CSFloat data is ingested.
- No database migration is required.

Install over the current ItemFuse project and run:
  npm.cmd run build
  vercel.cmd --prod
