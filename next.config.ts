import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: [
    "@meteora-ag/dynamic-bonding-curve-sdk",
    "@meteora-ag/cp-amm-sdk",
    "@coral-xyz/anchor",
    "@solana/web3.js",
  ],
  async headers() {
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
