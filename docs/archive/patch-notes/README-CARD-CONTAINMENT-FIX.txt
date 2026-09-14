ItemFuse inventory card containment hotfix

Fixes:
- Keeps Open to Offers inside the card border.
- Keeps sticker and non-sticker items aligned.
- Pins View details / Inspect in CS2 / Open to Offers to the card footer.
- Uses equal-height inventory rows without clipping the footer.
- CSS only: does not touch offers, notifications, database code, filters, or APIs.

Apply over the current project, then run:
  npm.cmd run build
  vercel.cmd --prod
