import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/config/env";

/**
 * Crawlers may read Pawket's own deployment, never a preview of it: a
 * preview is the same pages at another address. The API answers apps and
 * wallets, not search.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${getPublicEnv().appUrl}/sitemap.xml`,
  };
}
