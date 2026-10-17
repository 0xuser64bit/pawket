import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Meteora's SDKs (web3.js v1 + Anchor) run on the server only, as Node loads them.
  serverExternalPackages: [
    "@meteora-ag/dynamic-bonding-curve-sdk",
    "@meteora-ag/cp-amm-sdk",
    "@coral-xyz/anchor",
    "@solana/web3.js",
  ],
  async headers() {
    // No Pawket page is drawn inside another site's frame: a linked device signs
    // care, guilds and waves with no prompt, so a framed page could be clicked
    // into them. Nothing here uses a camera, a microphone or a location.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/market/:path+", destination: "/market", permanent: false },
      { source: "/guilds/boundary", destination: "/guilds", permanent: false },
      { source: "/pet/:id/ownership", destination: "/pet/:id", permanent: false },
      { source: "/playground/:game", destination: "/playground", permanent: false },
    ];
  },
};

export default nextConfig;
