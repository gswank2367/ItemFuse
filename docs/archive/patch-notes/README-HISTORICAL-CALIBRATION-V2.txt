ItemFuse Appraisal Engine v2 ΓÇö Historical Calibration

What it adds:
- On-demand 90-day Steam median-sale history.
- 90-day tracked marketplace history.
- Doppler/Gamma Doppler phase-specific history when available.
- Historical trend and volatility calibration for the appraisal baseline.
- Persists successful historical calibration into existing inventory raw_description JSONB; no schema migration required.
- Graceful fallback to Appraisal Engine v1 if the current Steam Data API plan does not include Price History.

How it works:
- Open an item's View details modal.
- ItemFuse fetches historical data server-side using STEAMDATA_API_KEY.
- Vercel caches provider history requests for 6 hours.
- If the item belongs to the signed-in user, the calibration summary is saved into that inventory item's existing enrichment JSON.
- Future page loads then use the persisted historical calibration in inventory totals, sorting, offer comparisons, and matching valuation.

Important limitation:
Historical market data calibrates the base market value, trend, volatility and Doppler phase prices. Exact float/Blue Gem premiums are still conservative modeled ranges because the provider does not expose sale-level historical specimens with exact float/pattern attributes.

Deployment:
  npm.cmd run build
  vercel.cmd --prod

No Neon migration or new environment variables are required.
