ItemFuse RGBA favicon/app-icon hotfix

Fixes Next.js/Turbopack build error:
  Processing image failed
  The PNG is not in RGBA format

This patch only replaces icon/image assets. It does not alter app code, auth,
inventory, offers, Neon, Steam APIs, or branding layout.

After extraction:
  npm.cmd run build
  vercel.cmd --prod
