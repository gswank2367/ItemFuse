ItemFuse clean inventory UI patch

Fixes and improvements:
- Removes the tiny inspect helper text from cards.
- Keeps action buttons aligned and the same height.
- Prevents Inspect / Open to Offers buttons from looking offset.
- Refreshes the inventory page with a cleaner hero area and decorative branded artwork.
- Reuses the cleaner card styling everywhere ItemDisplayCard is used.
- Sticker tooltip wording now shows unapplied sticker reference price when available.

Apply over your existing project folder, then run:
  npm.cmd run build
  vercel.cmd --prod
