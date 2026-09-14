ItemFuse Full Brand Refresh

Includes:
- Inventory-box ItemFuse logo selected from the concept board.
- Browser favicon, Apple icon, PWA icons and web app manifest.
- Rebuilt signed-out / Steam sign-in landing page.
- No soldier/player artwork on the landing page.
- Steam OpenID safety explanation and non-custodial messaging.
- ItemFuse logo automatically replaces the old lightning mark in authenticated page headers via CSS.
- Blue + green ItemFuse palette applied across navigation, hero panels, cards, forms and buttons.
- Mobile responsive landing page and navigation polish.

This patch does NOT change:
- Neon schema/data
- Steam authentication logic
- inventory APIs
- offers/counteroffers
- direct-friend offers
- notifications or messages

Apply over your existing ItemFuse project, then:
  npm.cmd run build
  vercel.cmd --prod

If the browser tab shows an older favicon after deploy, hard refresh or use an Incognito window because favicons are aggressively cached.
