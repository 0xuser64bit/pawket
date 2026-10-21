import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${getPublicEnv().appUrl}/sitemap.xml`,
  };
}
