ItemFuse favicon/app icon patch

Adds:
- Browser favicon (.ico + SVG)
- 512px application icon
- 180px Apple/mobile shortcut icon
- Explicit Next.js metadata icon registration

After extracting over the ItemFuse project:
  npm.cmd run build
  vercel.cmd --prod

Browser favicons are aggressively cached. If the old blank/globe icon remains after deployment,
open itemfuse.com in a new private/incognito window or hard refresh/restart the browser tab.
