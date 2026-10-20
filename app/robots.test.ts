// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

afterEach(() => vi.unstubAllEnvs());

it("lets crawlers read the production deployment only, and points them at its pages", () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pawket.world");
  const rules = robots();
  expect(rules.rules).toEqual({ userAgent: "*", allow: "/", disallow: "/api/" });
  expect(rules.sitemap).toBe("https://pawket.world/sitemap.xml");
  const pages = sitemap().map((page) => page.url);
  expect(pages).toContain("https://pawket.world");
  expect(pages.every((url) => !url.includes("/api/"))).toBe(true);
});
