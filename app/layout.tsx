import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./itemfuse-brand.css";

export const metadata: Metadata = {
  title: {
    default: "ItemFuse",
    template: "%s | ItemFuse",
  },
  description: "Trade smarter with ItemFuse — sync your CS2 inventory, discover traders, negotiate direct item offers, and complete trades through Steam.",
  applicationName: "ItemFuse",
  keywords: ["CS2", "Counter-Strike 2", "skin trading", "Steam trading", "CS2 inventory", "ItemFuse"],
  icons: {
    icon: [
      { url: "/itemfuse-mark-192.png", type: "image/png", sizes: "192x192" },
      { url: "/itemfuse-mark-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/itemfuse-mark.png", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "ItemFuse", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "ItemFuse",
    description: "Trade smarter. Find the item that fits.",
    siteName: "ItemFuse",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07131d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
