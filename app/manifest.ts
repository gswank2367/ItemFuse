import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ItemFuse",
    short_name: "ItemFuse",
    description: "Trade smarter. Find the item that fits.",
    start_url: "/",
    display: "standalone",
    background_color: "#07131d",
    theme_color: "#0aa6ff",
    icons: [
      { src: "/itemfuse-mark-192.png", sizes: "192x192", type: "image/png" },
      { src: "/itemfuse-mark-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
