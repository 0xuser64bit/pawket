import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
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
