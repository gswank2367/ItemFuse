ItemFuse friend inventory TypeScript hotfix

Fixes the build error where cached Steam Data API blueGem fields could be undefined,
while ItemDisplayData requires explicit null values.

This patch changes only lib/steam.ts and preserves the inventory filters, value totals,
card alignment, cached friend inventory behavior, and sticker pricing UI.

Apply over the project, then run:
  npm.cmd run build
  vercel.cmd --prod
