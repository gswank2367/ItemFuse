ItemFuse friend inventory rate-limit fix

Changes:
- Friend inventory pages use Steam Data API's cached inventory endpoint first.
- This avoids most direct steamcommunity.com inventory 429 responses.
- Direct Steam inventory remains as a fallback.
- Search/sort/price filtering remains client-side.
- Tradable-only UI is hidden on friend inventory pages because the provider's documented cached response does not guarantee live tradable flags.
- Own inventory sync remains unchanged/live.

No Neon migration or new environment variable is required.

Apply over the current project, then:
  npm.cmd run build
  vercel.cmd --prod
