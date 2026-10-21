import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/config/env";

const PAGES = ["/", "/adopt", "/park", "/market", "/guilds", "/playground", "/pulse", "/new", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const app = getPublicEnv().appUrl;
  return PAGES.map((path) => ({ url: path === "/" ? app : `${app}${path}` }));
}
