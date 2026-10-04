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
  async redirects() {
    return [
      { source: "/market", destination: "/profile", permanent: false },
      { source: "/market/:path*", destination: "/profile", permanent: false },
      { source: "/guilds/boundary", destination: "/guilds", permanent: false },
      { source: "/pet/:id/ownership", destination: "/pet/:id", permanent: false },
      { source: "/playground/:game", destination: "/playground", permanent: false },
    ];
  },
};

export default nextConfig;
