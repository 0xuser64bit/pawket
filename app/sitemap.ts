import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/config/env";

/** The pages anyone can open without a pet of their own. A guild's and a pet's pages are found from them. */
const PAGES = ["/", "/adopt", "/park", "/market", "/guilds", "/playground", "/pulse", "/new", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const app = getPublicEnv().appUrl;
  return PAGES.map((path) => ({ url: path === "/" ? app : `${app}${path}` }));
}
