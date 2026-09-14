ItemFuse inventory filter + value + alignment bundle

Includes the previous card alignment fix plus:
- search/filter toolbar on your Inventory page
- same toolbar on individual Friends inventory pages
- sort by price high/low, name A/Z, float, or tradable first
- min/max price filters
- tradable-only toggle
- estimated total inventory value range based on available item price sources
- shows price coverage (for example 43/46 items priced)
- filtered visible item value when filters are active
- filtering/sorting is client-side and does not trigger new Steam inventory requests
- preserves sticker hover market-price lookup behavior

No database changes or environment variables required.

After extracting over the current project:
  npm.cmd run build
  vercel.cmd --prod
