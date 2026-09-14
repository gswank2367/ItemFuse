import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "community.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "community.akamai.steamstatic.com" },
      { protocol: "https", hostname: "avatars.akamai.steamstatic.com" },
      { protocol: "https", hostname: "avatars.fastly.steamstatic.com" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "cdn.steamstatic.com" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net" },
      { protocol: "https", hostname: "raw.githubusercontent.com" }
    ]
  }
};

export default nextConfig;
